import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate && filters.endDate) {
      where.scheduledAt = { gte: new Date(filters.startDate), lte: new Date(filters.endDate) };
    }

    const [data, total] = await Promise.all([
      this.prisma.visit.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          property: { select: { id: true, name: true, code: true, address: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: filters.skip || 0,
        take: filters.take || 100,
      }),
      this.prisma.visit.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, companyId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, lead: { companyId } },
      include: {
        lead: true,
        property: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!visit) throw new NotFoundException('Visita não encontrada');
    return visit;
  }

  async create(companyId: string, userId: string, dto: any) {
    const visit = await this.prisma.visit.create({
      data: { ...dto, userId: dto.userId || userId },
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: dto.leadId,
        userId,
        type: 'VISIT',
        description: `Visita agendada para ${new Date(dto.scheduledAt).toLocaleDateString('pt-BR')}`,
        nextAction: 'Confirmar visita',
        nextContactAt: new Date(dto.scheduledAt),
      },
    });

    return visit;
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.visit.update({
      where: { id },
      data: dto,
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(id: string, companyId: string, status: any, feedback?: string) {
    await this.findOne(id, companyId);
    return this.prisma.visit.update({
      where: { id },
      data: { status, feedback },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.visit.delete({ where: { id } });
    return { message: 'Visita removida' };
  }
}
