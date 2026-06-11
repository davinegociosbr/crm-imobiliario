import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { companyId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total };
  }

  async create(companyId: string, userId: string, dto: any) {
    return this.prisma.task.create({
      data: {
        ...dto,
        companyId,
        createdByUserId: userId,
        assignedUserId: dto.assignedUserId || userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    const task = await this.prisma.task.findFirst({ where: { id, companyId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    if (dto.status === 'COMPLETED' && !dto.completedAt) {
      dto.completedAt = new Date();
    }

    return this.prisma.task.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, companyId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.prisma.task.delete({ where: { id } });
    return { message: 'Tarefa removida' };
  }

  async getOverdue(companyId: string) {
    return this.prisma.task.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueAt: { lt: new Date() },
      },
      include: { assignedUser: { select: { id: true, name: true } } },
      orderBy: { dueAt: 'asc' },
    });
  }
}
