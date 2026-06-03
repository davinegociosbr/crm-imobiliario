import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async getKanban(companyId: string, filters: any = {}) {
    const stages = ['INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE'];
    const where: any = {
      companyId,
      status: { notIn: ['WON', 'LOST'] },
    };

    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { id: true, name: true, avatar: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const kanban: Record<string, any[]> = {};
    stages.forEach((stage) => {
      kanban[stage] = leads.filter((l) => l.pipelineStage === stage);
    });

    return kanban;
  }

  async moveCard(leadId: string, companyId: string, stage: any, userId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) return null;

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStage: stage,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      },
    });
  }
}
