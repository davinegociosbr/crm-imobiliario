import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(companyId: string, period = 'month') {
    const now = new Date();
    const start = period === 'year' ? startOfYear(now) : startOfMonth(now);
    const end = period === 'year' ? endOfYear(now) : endOfMonth(now);

    const [
      activeLeadsRaw,
      newLeadsRaw,
      inProgressLeads,
      scheduledVisits,
      completedVisits,
      sales,
      commissions,
      tasks,
    ] = await Promise.all([
      // Busca leads ativos para deduplicar por telefone
      this.prisma.lead.findMany({
        where: { companyId, status: { notIn: ['WON', 'LOST'] } },
        select: { phone: true, whatsapp: true },
      }),
      // Leads criados no período para deduplicar por telefone
      this.prisma.lead.findMany({
        where: { companyId, status: { notIn: ['LOST'] }, createdAt: { gte: start, lte: end } },
        select: { phone: true, whatsapp: true },
      }),
      // Negócios no funil — todos os cards ativos (sem deduplicar)
      this.prisma.lead.count({ where: { companyId, status: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.visit.count({
        where: { lead: { companyId }, status: 'SCHEDULED', scheduledAt: { gte: start, lte: end } },
      }),
      this.prisma.visit.count({
        where: { lead: { companyId }, status: 'COMPLETED', scheduledAt: { gte: start, lte: end } },
      }),
      this.prisma.sale.findMany({
        where: { lead: { companyId }, status: 'ACTIVE', soldAt: { gte: start, lte: end } },
        select: { saleValue: true, commissionValue: true },
      }),
      this.prisma.commission.findMany({
        where: { user: { companyId }, status: 'RECEIVED' },
        select: { value: true },
      }),
      this.prisma.task.count({
        where: { companyId, status: 'PENDING', dueAt: { lte: now } },
      }),
    ]);

    // Deduplicação por telefone
    const uniquePhone = (leads: { phone: string; whatsapp: string | null }[]) => {
      const seen = new Set<string>();
      for (const l of leads) {
        const p = (l.whatsapp || l.phone || '').replace(/\D/g, '');
        if (p) seen.add(p);
      }
      return seen.size || leads.length;
    };

    const totalLeads = uniquePhone(activeLeadsRaw);
    const newLeads   = uniquePhone(newLeadsRaw);
    // inProgressLeads já vem do banco (todos os cards no funil)

    const totalSoldValue = sales.reduce((acc, s) => acc + Number(s.saleValue), 0);
    const totalCommission = sales.reduce((acc, s) => acc + Number(s.commissionValue), 0);
    const avgTicket = sales.length > 0 ? totalSoldValue / sales.length : 0;

    const conversionRate = totalLeads > 0 ? (sales.length / totalLeads) * 100 : 0;

    return {
      totalLeads,
      newLeads,
      inProgressLeads,
      scheduledVisits,
      completedVisits,
      totalSales: sales.length,
      totalSoldValue,
      avgTicket,
      totalCommission,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      overdueTasks: tasks,
    };
  }

  async getSalesByMonth(companyId: string) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const sales = await this.prisma.sale.findMany({
        where: { lead: { companyId }, soldAt: { gte: start, lte: end }, status: 'ACTIVE' },
        select: { saleValue: true },
      });

      months.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        count: sales.length,
        value: sales.reduce((acc, s) => acc + Number(s.saleValue), 0),
      });
    }
    return months;
  }

  async getLeadsByOrigin(companyId: string) {
    const result = await this.prisma.lead.groupBy({
      by: ['origin'],
      where: { companyId, status: { notIn: ['LOST'] } },
      _count: { id: true },
    });

    const originLabels: Record<string, string> = {
      WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
      REFERRAL: 'Indicação', PORTAL_IMOVEIS: 'Portal Imóveis', WEBSITE: 'Site',
      COLD_CALL: 'Ligação', EMAIL: 'E-mail', OTHER: 'Outros',
    };

    return result.map((r) => ({
      origin: originLabels[r.origin] || r.origin,
      count: r._count.id,
    }));
  }

  async getConversionByStage(companyId: string) {
    const stages = ['INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE'];
    const labels: Record<string, string> = {
      INITIAL_CONTACT: 'Contato Inicial', REDIRECT: 'Redirecionar', ATTENDANCE: 'Atendimento',
      TODAY: 'Hoje', FOLLOW_UP: 'Follow-up', CLIENTS: 'Clientes', INACTIVE: 'Inativos',
    };
    return Promise.all(
      stages.map(async (stage) => ({
        stage,
        label: labels[stage],
        count: await this.prisma.lead.count({ where: { companyId, pipelineStage: stage as any, status: { notIn: ['WON', 'LOST'] } } }),
      })),
    );
  }

  async getReminders(companyId: string) {
    const now = new Date();
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const leads = await this.prisma.lead.findMany({
      where: {
        companyId,
        nextContactAt: { lte: endOfTomorrow },
        status: { notIn: ['WON', 'LOST'] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        nextContactAt: true,
        pipelineStage: true,
        nextAction: true,
      },
      orderBy: { nextContactAt: 'asc' },
      take: 20,
    });

    return leads.map(l => ({
      ...l,
      overdue: l.nextContactAt! < now,
      today: l.nextContactAt!.toDateString() === now.toDateString(),
    }));
  }

  async getLeadsByPipelineStage(companyId: string) {
    const stages = ['INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE'];
    const labels: Record<string, string> = {
      INITIAL_CONTACT: 'Contato Inicial', REDIRECT: 'Redirecionar', ATTENDANCE: 'Atendimento',
      TODAY: 'Hoje', FOLLOW_UP: 'Follow-up', CLIENTS: 'Clientes', INACTIVE: 'Inativos',
    };
    return Promise.all(
      stages.map(async (stage) => ({
        stage,
        label: labels[stage],
        // Exclui leads LOST/WON para mostrar apenas quem está ativo no funil
        count: await this.prisma.lead.count({ where: { companyId, pipelineStage: stage as any, status: { notIn: ['WON', 'LOST'] } } }),
      })),
    );
  }

  async getBrokerPerformance(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId, role: { in: ['BROKER', 'MANAGER'] } },
      select: { id: true, name: true },
    });

    return Promise.all(
      users.map(async (u) => {
        const [leads, sales] = await Promise.all([
          this.prisma.lead.count({ where: { companyId, assignedUserId: u.id } }),
          this.prisma.sale.findMany({
            where: { userId: u.id, lead: { companyId }, status: 'ACTIVE' },
            select: { commissionValue: true },
          }),
        ]);
        return {
          user: u,
          leads,
          sales: sales.length,
          commission: sales.reduce((acc, s) => acc + Number(s.commissionValue), 0),
        };
      }),
    );
  }
}
