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
      totalLeads,
      newLeads,
      inProgressLeads,
      scheduledVisits,
      completedVisits,
      sales,
      commissions,
      tasks,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { companyId } }),
      this.prisma.lead.count({ where: { companyId, status: 'NEW', createdAt: { gte: start, lte: end } } }),
      this.prisma.lead.count({ where: { companyId, status: 'IN_PROGRESS' } }),
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
      where: { companyId },
      _count: { id: true },
    });

    return result.map((r) => ({ origin: r.origin, count: r._count.id }));
  }

  async getConversionByStage(companyId: string) {
    const stages = ['INITIAL_CONTACT', 'QUALIFICATION', 'NEGOTIATION', 'CONTRACT_SIGNING'];
    return Promise.all(
      stages.map(async (stage) => ({
        stage,
        count: await this.prisma.lead.count({ where: { companyId, pipelineStage: stage as any } }),
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
