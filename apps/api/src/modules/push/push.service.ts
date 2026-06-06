import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:brolezinegocios@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  // Salva a subscription do browser do usuário
  async saveSubscription(userId: string, subscription: any) {
    const { endpoint, keys } = subscription;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    return { ok: true };
  }

  // Remove subscription (quando usuário desativa notificações)
  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  // Envia notificação para um usuário específico
  async sendToUser(userId: string, payload: { title: string; body: string; url?: string; icon?: string }) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const data = JSON.stringify({ ...payload, icon: payload.icon || '/icons/icon-192x192.png' });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        );
      } catch (err: any) {
        // Subscription expirada — remove do banco
        if (err.statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        this.logger.warn(`Falha ao enviar push para ${sub.endpoint}: ${err.message}`);
      }
    }
  }

  // Roda todo dia às 08:00 (Brasília) — lembra contatos vencidos e do dia
  @Cron('0 11 * * *') // 11h UTC = 08h Brasília
  async sendDailyReminders() {
    this.logger.log('Enviando lembretes diários via push...');
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    // Busca todos usuários com subscriptions
    const users = await this.prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of users) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, name: true } });
      if (!user) continue;

      const [overdueLeads, todayLeads, overdueTasks] = await Promise.all([
        this.prisma.lead.count({
          where: { companyId: user.companyId, assignedUserId: userId, nextContactAt: { lt: startOfDay }, status: { notIn: ['WON', 'LOST'] } },
        }),
        this.prisma.lead.count({
          where: { companyId: user.companyId, assignedUserId: userId, nextContactAt: { gte: startOfDay, lte: endOfDay }, status: { notIn: ['WON', 'LOST'] } },
        }),
        this.prisma.task.count({
          where: { companyId: user.companyId, assignedUserId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueAt: { lt: now } },
        }),
      ]);

      const parts: string[] = [];
      if (todayLeads > 0) parts.push(`${todayLeads} contato(s) hoje`);
      if (overdueLeads > 0) parts.push(`${overdueLeads} vencido(s)`);
      if (overdueTasks > 0) parts.push(`${overdueTasks} tarefa(s) atrasada(s)`);

      if (parts.length === 0) continue;

      await this.sendToUser(userId, {
        title: '📋 CRM Brolezi — Bom dia!',
        body: parts.join(' · '),
        url: '/agenda',
      });
    }
  }

  // Lembrete 30 minutos antes de um contato agendado
  @Cron('*/30 * * * *') // A cada 30 min
  async sendUpcomingReminders() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);
    const in35 = new Date(now.getTime() + 35 * 60 * 1000);

    const leads = await this.prisma.lead.findMany({
      where: { nextContactAt: { gte: in30, lte: in35 }, status: { notIn: ['WON', 'LOST'] }, assignedUserId: { not: null } },
      select: { name: true, nextAction: true, assignedUserId: true },
    });

    for (const lead of leads) {
      if (!lead.assignedUserId) continue;
      await this.sendToUser(lead.assignedUserId, {
        title: `⏰ Contato em 30 min: ${lead.name}`,
        body: lead.nextAction || 'Verifique a agenda',
        url: '/agenda',
      });
    }
  }
}
