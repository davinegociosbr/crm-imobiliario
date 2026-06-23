import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStatus, LeadOrigin } from '@prisma/client';

export class CreateLeadDto {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  birthDate?: Date;
  maritalStatus?: any;
  city?: string;
  state?: string;
  incomeRange?: string;
  investmentRange?: string;
  interest?: string;
  notes?: string;
  origin?: LeadOrigin;
  potentialValue?: number;
  assignedUserId?: string;
}

export class UpdateLeadDto extends CreateLeadDto {
  status?: LeadStatus;
  pipelineStage?: string;
  nextAction?: string;
  nextContactAt?: Date;
  lostReason?: string;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.origin) where.origin = filters.origin;
    if (filters.pipelineStage) where.pipelineStage = filters.pipelineStage;
    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, name: true, avatar: true } },
          _count: { select: { activities: true, visits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, companyId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        assignedUser: { select: { id: true, name: true, avatar: true } },
        activities: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
        visits: {
          include: {
            property: { select: { id: true, name: true, code: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'desc' },
        },
        proposals: {
          include: { property: { select: { id: true, name: true, code: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: { assignedUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        sales: {
          include: { property: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  private sanitize(dto: any) {
    const clean: any = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === '' || v === undefined) clean[k] = null;
      else clean[k] = v;
    }
    if (clean.potentialValue !== null && clean.potentialValue !== undefined) {
      clean.potentialValue = Number(clean.potentialValue) || null;
    }
    if (clean.birthDate !== null && clean.birthDate !== undefined) {
      clean.birthDate = new Date(clean.birthDate);
    }
    return clean;
  }

  async create(companyId: string, userId: string, dto: CreateLeadDto) {
    const data = this.sanitize(dto);

    // Verifica duplicata por telefone — busca pelos últimos 9 dígitos diretamente no banco
    const phone = (data.phone || '').replace(/\D/g, '');
    if (phone && phone.length >= 8) {
      const suffix = phone.slice(-9);
      const existing = await this.prisma.lead.findFirst({
        where: {
          companyId,
          OR: [
            { phone: { endsWith: suffix } },
            { whatsapp: { endsWith: suffix } },
          ],
        },
        select: { id: true, name: true },
      });
      if (existing) {
        throw new ConflictException(`Já existe um lead com este telefone: ${existing.name}`);
      }
    }

    return this.prisma.lead.create({
      data: {
        ...data,
        companyId,
        assignedUserId: data.assignedUserId || userId,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, companyId: string, dto: UpdateLeadDto) {
    const exists = await this.prisma.lead.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Lead não encontrado');
    const data = this.sanitize(dto);
    return this.prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: { id: true, name: true } },
      },
    });
  }

  async updatePipelineStage(id: string, companyId: string, stage: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!lead) throw new NotFoundException('Lead não encontrado');

    await this.prisma.activity.create({
      data: {
        leadId: id,
        userId,
        type: 'NOTE',
        description: `Movido para etapa: ${stage}`,
      },
    });

    return this.prisma.lead.update({
      where: { id },
      data: { pipelineStage: stage },
    });
  }

  async remove(id: string, companyId: string) {
    const exists = await this.prisma.lead.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Lead não encontrado');
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead removido com sucesso' };
  }

  async getStats(companyId: string) {
    const [total, newLeads, inProgress, won, lost] = await Promise.all([
      this.prisma.lead.count({ where: { companyId } }),
      this.prisma.lead.count({ where: { companyId, status: 'NEW' } }),
      this.prisma.lead.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      this.prisma.lead.count({ where: { companyId, status: 'WON' } }),
      this.prisma.lead.count({ where: { companyId, status: 'LOST' } }),
    ]);

    return { total, newLeads, inProgress, won, lost };
  }
}
