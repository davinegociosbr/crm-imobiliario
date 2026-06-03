import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate && filters.endDate) {
      where.soldAt = { gte: new Date(filters.startDate), lte: new Date(filters.endDate) };
    }

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          property: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
          commissions: true,
        },
        orderBy: { soldAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, companyId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, lead: { companyId } },
      include: { lead: true, property: true, user: true, commissions: true },
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  async create(companyId: string, userId: string, dto: any) {
    const commissionValue = (dto.saleValue * dto.commissionPercent) / 100;

    const sale = await this.prisma.sale.create({
      data: {
        leadId: dto.leadId,
        propertyId: dto.propertyId,
        userId: dto.userId || userId,
        saleValue: dto.saleValue,
        commissionPercent: dto.commissionPercent,
        commissionValue,
        soldAt: dto.soldAt ? new Date(dto.soldAt) : new Date(),
        notes: dto.notes,
        commissions: {
          create: {
            userId: dto.userId || userId,
            percent: dto.commissionPercent,
            value: commissionValue,
          },
        },
      },
      include: { lead: true, property: true, commissions: true },
    });

    await Promise.all([
      this.prisma.lead.update({ where: { id: dto.leadId }, data: { status: 'WON' } }),
      this.prisma.property.update({ where: { id: dto.propertyId }, data: { status: 'SOLD' } }),
    ]);

    return sale;
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.sale.update({ where: { id }, data: dto });
  }

  async getSummary(companyId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { lead: { companyId }, status: 'ACTIVE' },
      select: { saleValue: true, commissionValue: true },
    });

    const total = sales.reduce((acc, s) => acc + Number(s.saleValue), 0);
    const commission = sales.reduce((acc, s) => acc + Number(s.commissionValue), 0);

    return {
      count: sales.length,
      totalValue: total,
      totalCommission: commission,
      avgTicket: sales.length > 0 ? total / sales.length : 0,
    };
  }
}
