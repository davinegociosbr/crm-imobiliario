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
      // Leads com status NEW (aguardando funil)
      this.prisma.lead.findMany({
        where: { companyId, status: 'NEW' },
        select: { phone: true, whatsapp: true },
      }),
      // Negócios no funil — apenas leads em atendimento (adicionados ao kanban)
      this.prisma.lead.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.visit.count({
        where: { lead: { companyId }, status: 'SCHEDULED', scheduledAt: { gte: start, lte: end } },
      }),
      this.prisma.visit.count({
        where: { lead: { companyId }, status: 'COMPLETED', scheduledAt: { gte: start, lte: end } },
      }),
      // Vendas — todas (sem filtro de período) para mostrar total real
      this.prisma.sale.findMany({
        where: { lead: { companyId }, status: 'ACTIVE' },
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
    const start = startOfMonth(subMonths(new Date(), 5));
    const end = endOfMonth(new Date());

    const sales = await this.prisma.sale.findMany({
      where: { lead: { companyId }, soldAt: { gte: start, lte: end }, status: 'ACTIVE' },
      select: { saleValue: true, soldAt: true },
    });

    // Agrupa em memória (poucos registros por mês)
    const map = new Map<string, { count: number; value: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      map.set(key, { count: 0, value: 0 });
    }
    for (const s of sales) {
      const key = new Date(s.soldAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const entry = map.get(key);
      if (entry) { entry.count++; entry.value += Number(s.saleValue); }
    }
    return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
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
    const rows = await this.prisma.lead.groupBy({
      by: ['pipelineStage'],
      where: { companyId, pipelineStage: { in: stages }, status: { notIn: ['WON', 'LOST'] } },
      _count: { id: true },
    });
    const countMap = Object.fromEntries(rows.map(r => [r.pipelineStage, r._count.id]));
    return stages.map(stage => ({ stage, label: labels[stage], count: countMap[stage] ?? 0 }));
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
    const rows = await this.prisma.lead.groupBy({
      by: ['pipelineStage'],
      where: { companyId, pipelineStage: { in: stages }, status: { notIn: ['WON', 'LOST'] } },
      _count: { id: true },
    });
    const countMap = Object.fromEntries(rows.map(r => [r.pipelineStage, r._count.id]));
    return stages.map(stage => ({ stage, label: labels[stage], count: countMap[stage] ?? 0 }));
  }

  async getBrokerPerformance(companyId: string) {
    const [users, leadCounts, sales] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId, role: { in: ['BROKER', 'MANAGER'] } },
        select: { id: true, name: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedUserId'],
        where: { companyId, assignedUserId: { not: null } },
        _count: { id: true },
      }),
      this.prisma.sale.findMany({
        where: { lead: { companyId }, status: 'ACTIVE' },
        select: { userId: true, commissionValue: true },
      }),
    ]);

    const leadMap = Object.fromEntries(leadCounts.map(r => [r.assignedUserId, r._count.id]));
    const saleMap: Record<string, { count: number; commission: number }> = {};
    for (const s of sales) {
      if (!saleMap[s.userId]) saleMap[s.userId] = { count: 0, commission: 0 };
      saleMap[s.userId].count++;
      saleMap[s.userId].commission += Number(s.commissionValue);
    }

    return users.map(u => ({
      user: u,
      leads: leadMap[u.id] ?? 0,
      sales: saleMap[u.id]?.count ?? 0,
      commission: saleMap[u.id]?.commission ?? 0,
    }));
  }
}
