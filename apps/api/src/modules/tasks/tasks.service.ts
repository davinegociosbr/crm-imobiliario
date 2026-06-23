import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  // Gera ocorrências em background ao iniciar (não bloqueia o startup do servidor)
  onModuleInit() {
    this.generateRecurringTasks().catch(() => {});
  }

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

  // Gera ocorrências para uma tarefa recorrente a partir de HOJE
  private async generateOccurrences(task: any, daysAhead: number) {
    if (!task.recurrenceType) return;

    // Usa dueAt do pai como referência de horário; se não tiver, usa meio-dia
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    const baseHour = base.getHours();
    const baseMin  = base.getMinutes();

    // Gera a partir de HOJE (não de base+1), para nunca perder o dia atual
    const startDate = new Date();
    startDate.setHours(baseHour, baseMin, 0, 0);

    const until = task.recurrenceEnd
      ? new Date(task.recurrenceEnd)
      : new Date(Date.now() + daysAhead * 86400000);

    const occurrences: Date[] = [];

    if (task.recurrenceType === 'DAILY') {
      const d = new Date(startDate);
      while (d <= until) {
        // Pula a data original do pai (ele próprio já é a primeira ocorrência)
        if (!task.dueAt || d.toDateString() !== base.toDateString()) {
          occurrences.push(new Date(d));
        }
        d.setDate(d.getDate() + 1);
      }
    } else if (task.recurrenceType === 'WEEKLY') {
      const days: number[] = task.recurrenceDays || [];
      if (!days.length) return;
      const d = new Date(startDate);
      while (d <= until) {
        if (days.includes(d.getDay()) &&
            (!task.dueAt || d.toDateString() !== base.toDateString())) {
          occurrences.push(new Date(d));
        }
        d.setDate(d.getDate() + 1);
      }
    } else if (task.recurrenceType === 'MONTHLY') {
      const dayOfMonth = task.recurrenceDay || base.getDate();
      const d = new Date(startDate);
      d.setDate(1); // começa do início do mês atual
      while (d <= until) {
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const target = new Date(d.getFullYear(), d.getMonth(),
          Math.min(dayOfMonth, last), baseHour, baseMin, 0, 0);
        if (target >= startDate && target <= until &&
            (!task.dueAt || target.toDateString() !== base.toDateString())) {
          occurrences.push(new Date(target));
        }
        d.setMonth(d.getMonth() + 1);
      }
    }

    if (!occurrences.length) return;

    // Deduplicação por data (ignora horário para evitar duplicatas por fuso)
    const existing = await this.prisma.task.findMany({
      where: { parentTaskId: task.id },
      select: { dueAt: true },
    });
    const existingDates = new Set(
      existing.map((t: any) => t.dueAt ? new Date(t.dueAt).toDateString() : null)
    );

    const toCreate = occurrences.filter(d => !existingDates.has(d.toDateString()));
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

  // Roda todo dia às 00:01 — gera apenas as ocorrências do dia seguinte
  @Cron('1 0 * * *')
  async generateRecurringTasks() {
    const templates = await this.prisma.task.findMany({
      where: {
        recurrenceType: { not: null },
        OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gt: new Date() } }],
        parentTaskId: null,
      },
    });

    for (const task of templates) {
      await this.generateOccurrences(task, 1);
    }
  }

  // Endpoint para forçar geração manual (útil para recuperar dias perdidos)
  async forceGenerate(companyId: string) {
    const templates = await this.prisma.task.findMany({
      where: {
        companyId,
        recurrenceType: { not: null },
        OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gt: new Date() } }],
        parentTaskId: null,
      },
    });
    for (const task of templates) {
      await this.generateOccurrences(task, 60);
    }
    return { generated: templates.length };
  }
}
