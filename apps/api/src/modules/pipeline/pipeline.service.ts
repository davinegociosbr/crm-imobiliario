import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async getKanban(companyId: string, filters: any = {}) {
    const where: any = {
      companyId,
      status: { notIn: ['WON', 'LOST'] },
    };

    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;

    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        interest: true,
        pipelineStage: true,
        nextAction: true,
        nextContactAt: true,
        origin: true,
        status: true,
        updatedAt: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Agrupa por pipelineStage (inclui colunas customizadas dinamicamente)
    const kanban: Record<string, any[]> = {};
    for (const lead of leads) {
      const stage = lead.pipelineStage || 'INITIAL_CONTACT';
      if (!kanban[stage]) kanban[stage] = [];
      kanban[stage].push(lead);
    }

    return kanban;
  }

  async removeFromPipeline(leadId: string, companyId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) return null;
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'LOST', lostReason: 'Removido do funil' },
    });
  }

  async moveCard(leadId: string, companyId: string, stage: string, userId: string) {
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
