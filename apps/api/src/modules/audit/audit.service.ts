import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: { companyId: string; userId?: string; action: string; entity: string; entityId?: string; oldValues?: any; newValues?: any; ipAddress?: string }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { companyId };
    if (filters.entity) where.entity = filters.entity;
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate) where.createdAt = { gte: new Date(filters.startDate) };

    return this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters.take || 100,
    });
  }
}
