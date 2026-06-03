import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProposalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.status) where.status = filters.status;
    if (filters.leadId) where.leadId = filters.leadId;

    const [data, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          property: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, companyId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, lead: { companyId } },
      include: {
        lead: true,
        property: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    return proposal;
  }

  async create(companyId: string, userId: string, dto: any) {
    const lastVersion = await this.prisma.proposal.findFirst({
      where: { leadId: dto.leadId, propertyId: dto.propertyId },
      orderBy: { version: 'desc' },
    });

    const proposal = await this.prisma.proposal.create({
      data: {
        ...dto,
        userId: dto.userId || userId,
        version: lastVersion ? lastVersion.version + 1 : 1,
        propertyValue: dto.propertyValue,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await this.prisma.activity.create({
      data: {
        leadId: dto.leadId,
        userId,
        type: 'PROPOSAL',
        description: `Proposta v${proposal.version} gerada - R$ ${Number(dto.propertyValue).toLocaleString('pt-BR')}`,
      },
    });

    return proposal;
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.proposal.update({ where: { id }, data: dto });
  }
}
