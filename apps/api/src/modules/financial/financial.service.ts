import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: { type?: string; status?: string; search?: string }) {
    const where: any = { companyId };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.financialEntry.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { lead: { select: { id: true, name: true } } },
    });
  }

  async create(companyId: string, dto: any) {
    return this.prisma.financialEntry.create({
      data: {
        companyId,
        type: dto.type,
        category: dto.category || 'OTHER',
        description: dto.description,
        amount: parseFloat(dto.amount),
        dueDate: new Date(dto.dueDate + 'T12:00:00Z'),
        status: dto.status || 'PENDING',
        contactName: dto.contactName || null,
        notes: dto.notes || null,
        leadId: dto.leadId || null,
        saleId: dto.saleId || null,
      },
    });
  }

  async update(companyId: string, id: string, dto: any) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, companyId } });
    if (!entry) throw new NotFoundException();
    return this.prisma.financialEntry.update({
      where: { id },
      data: {
        type: dto.type ?? entry.type,
        category: dto.category ?? entry.category,
        description: dto.description ?? entry.description,
        amount: dto.amount != null ? parseFloat(dto.amount) : entry.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate + 'T12:00:00Z') : entry.dueDate,
        status: dto.status ?? entry.status,
        contactName: dto.contactName !== undefined ? dto.contactName || null : entry.contactName,
        notes: dto.notes !== undefined ? dto.notes || null : entry.notes,
        paidAt: dto.status === 'PAID' && !entry.paidAt ? new Date() : (dto.status && dto.status !== 'PAID' ? null : entry.paidAt),
        leadId: dto.leadId !== undefined ? dto.leadId || null : entry.leadId,
      },
    });
  }

  async remove(companyId: string, id: string) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, companyId } });
    if (!entry) throw new NotFoundException();
    return this.prisma.financialEntry.delete({ where: { id } });
  }

  async getSummary(companyId: string) {
    const now = new Date();
    const entries = await this.prisma.financialEntry.findMany({
      where: { companyId, status: { not: 'CANCELLED' } },
      select: { type: true, status: true, amount: true, dueDate: true },
    });

    let totalReceivable = 0, receivedPaid = 0, totalPayable = 0, payablePaid = 0;
    let overdueReceivable = 0, overduePayable = 0;

    for (const e of entries) {
      const amt = Number(e.amount);
      const overdue = e.status === 'PENDING' && e.dueDate < now;
      if (e.type === 'RECEIVABLE') {
        totalReceivable += amt;
        if (e.status === 'PAID') receivedPaid += amt;
        if (overdue) overdueReceivable += amt;
      } else {
        totalPayable += amt;
        if (e.status === 'PAID') payablePaid += amt;
        if (overdue) overduePayable += amt;
      }
    }

    return {
      totalReceivable,
      receivedPaid,
      pendingReceivable: totalReceivable - receivedPaid,
      overdueReceivable,
      totalPayable,
      payablePaid,
      pendingPayable: totalPayable - payablePaid,
      overduePayable,
      balance: totalReceivable - totalPayable,
    };
  }
}
