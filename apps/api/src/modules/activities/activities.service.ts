import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findByLead(leadId: string, companyId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    return this.prisma.activity.findMany({
      where: { leadId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, userId: string, dto: any) {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, companyId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    if (dto.nextContactAt) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: {
          nextAction: dto.nextAction,
          nextContactAt: new Date(dto.nextContactAt),
          status: lead.status === 'NEW' ? 'IN_PROGRESS' : lead.status,
        },
      });
    }

    return this.prisma.activity.create({
      data: {
        leadId: dto.leadId,
        userId,
        type: dto.type,
        description: dto.description,
        nextAction: dto.nextAction || null,
        nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : null,
        notes: dto.notes || null,
        isCompleted: dto.isCompleted ?? false,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.activity.update({
      where: { id },
      data: {
        description: dto.description,
        nextAction: dto.nextAction,
        nextContactAt: dto.nextContactAt ? new Date(dto.nextContactAt) : null,
        notes: dto.notes,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async toggleCompleted(id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Nota não encontrada');

    return this.prisma.activity.update({
      where: { id },
      data: { isCompleted: !activity.isCompleted },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.activity.delete({ where: { id } });
    return { message: 'Nota removida' };
  }

  async findRecent(companyId: string, limit = 20) {
    return this.prisma.activity.findMany({
      where: { lead: { companyId } },
      include: {
        lead: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
