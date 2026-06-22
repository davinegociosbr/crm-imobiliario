import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
    const { recurrenceType, recurrenceDays, recurrenceDay, recurrenceEnd, ...rest } = dto;

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        companyId,
        createdByUserId: userId,
        assignedUserId: dto.assignedUserId || userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        recurrenceType: recurrenceType || null,
        recurrenceDays: recurrenceDays || [],
        recurrenceDay: recurrenceDay || null,
        recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    // Gera ocorrências para os próximos 60 dias imediatamente
    if ((recurrenceType === 'WEEKLY' && recurrenceDays?.length) ||
        recurrenceType === 'DAILY' ||
        (recurrenceType === 'MONTHLY' && (recurrenceDay || dto.dueAt))) {
      await this.generateOccurrences(task, 60);
    }

    return task;
  }

  async update(id: string, companyId: string, dto: any) {
    const task = await this.prisma.task.findFirst({ where: { id, companyId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    if (dto.status === 'COMPLETED' && !dto.completedAt) {
      dto.completedAt = new Date();
    }

    const { recurrenceType, recurrenceDays, recurrenceEnd, ...rest } = dto;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(recurrenceType !== undefined && { recurrenceType: recurrenceType || null }),
        ...(recurrenceDays !== undefined && { recurrenceDays }),
        ...(recurrenceEnd !== undefined && { recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null }),
      },
    });
  }

  async remove(id: string, companyId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, companyId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    // Remove também ocorrências futuras pendentes geradas por esta tarefa pai
    await this.prisma.task.deleteMany({
      where: { parentTaskId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
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

  // Gera ocorrências futuras para uma tarefa recorrente
  private async generateOccurrences(task: any, daysAhead: number) {
    if (!task.recurrenceType || !task.dueAt) return;

    const base = new Date(task.dueAt);
    const until = task.recurrenceEnd
      ? new Date(task.recurrenceEnd)
      : new Date(Date.now() + daysAhead * 86400000);

    const occurrences: Date[] = [];

    if (task.recurrenceType === 'DAILY') {
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      while (d <= until) {
        occurrences.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (task.recurrenceType === 'WEEKLY') {
      const days: number[] = task.recurrenceDays || [];
      if (!days.length) return;
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      while (d <= until) {
        if (days.includes(d.getDay())) occurrences.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (task.recurrenceType === 'MONTHLY') {
      const dayOfMonth = task.recurrenceDay || base.getDate();
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      while (d <= until) {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(dayOfMonth, last));
        occurrences.push(new Date(d));
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
      }
    }

    // Verifica quais datas já têm ocorrência para não duplicar
    const existing = await this.prisma.task.findMany({
      where: { parentTaskId: task.id, dueAt: { in: occurrences } },
      select: { dueAt: true },
    });
    const existingTimes = new Set(existing.map((t: any) => t.dueAt?.getTime()));

    const toCreate = occurrences.filter(d => !existingTimes.has(d.getTime()));
    if (!toCreate.length) return;

    await this.prisma.task.createMany({
      data: toCreate.map(d => ({
        companyId: task.companyId,
        assignedUserId: task.assignedUserId,
        createdByUserId: task.createdByUserId,
        leadId: task.leadId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueAt: d,
        parentTaskId: task.id,
      })),
    });
  }

  // Roda todo dia às 06:00 — gera ocorrências para os próximos 7 dias
  @Cron('0 6 * * *')
  async generateRecurringTasks() {
    const templates = await this.prisma.task.findMany({
      where: {
        recurrenceType: { not: null },
        OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gt: new Date() } }],
        parentTaskId: null,
      },
    });

    for (const task of templates) {
      await this.generateOccurrences(task, 7);
    }
  }
}
