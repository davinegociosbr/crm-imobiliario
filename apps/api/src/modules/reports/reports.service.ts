import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getLeadsReport(companyId: string, filters: any = {}) {
    const where: any = { companyId };
    if (filters.startDate) where.createdAt = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
    if (filters.origin) where.origin = filters.origin;
    if (filters.status) where.status = filters.status;

    return this.prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true } },
        _count: { select: { activities: true, visits: true, sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalesReport(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.startDate) where.soldAt = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.soldAt = { ...where.soldAt, lte: new Date(filters.endDate) };
    if (filters.userId) where.userId = filters.userId;

    return this.prisma.sale.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true } },
        commissions: true,
      },
      orderBy: { soldAt: 'desc' },
    });
  }

  async getVisitsReport(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.startDate) where.scheduledAt = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.scheduledAt = { ...where.scheduledAt, lte: new Date(filters.endDate) };
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;

    return this.prisma.visit.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getCommissionsReport(companyId: string, filters: any = {}) {
    const where: any = { user: { companyId } };
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    return this.prisma.commission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        sale: {
          include: {
            lead: { select: { id: true, name: true } },
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getKpiAdvanced(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.startDate) where.soldAt = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.soldAt = { ...where.soldAt, lte: new Date(filters.endDate) };

    const [totalLeads, wonLeads, sales, visitStats] = await Promise.all([
      this.prisma.lead.count({ where: { companyId } }),
      this.prisma.lead.count({ where: { companyId, status: 'WON' } }),
      this.prisma.sale.findMany({
        where,
        select: { saleValue: true, commissionValue: true, userId: true, propertyId: true },
      }),
      this.prisma.visit.groupBy({
        by: ['status'],
        where: { lead: { companyId } },
        _count: true,
      }),
    ]);

    const totalSalesValue = sales.reduce((acc, s) => acc + Number(s.saleValue), 0);
    const totalCommission = sales.reduce((acc, s) => acc + Number(s.commissionValue), 0);

    return {
      totalLeads,
      convertedLeads: wonLeads,
      conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(2) : '0',
      totalSales: sales.length,
      totalSalesValue,
      avgTicket: sales.length > 0 ? totalSalesValue / sales.length : 0,
      totalCommission,
      visitStats,
    };
  }
}
