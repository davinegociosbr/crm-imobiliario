import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { user: { companyId } };
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          sale: {
            include: {
              lead: { select: { id: true, name: true } },
              property: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.commission.count({ where }),
    ]);

    return { data, total };
  }

  async updateStatus(id: string, companyId: string, status: string, paidAt?: string) {
    return this.prisma.commission.update({
      where: { id },
      data: { status: status as any, paidAt: paidAt ? new Date(paidAt) : null },
    });
  }

  async getSummaryByBroker(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });

    return Promise.all(
      users.map(async (u) => {
        const [pending, received, paid] = await Promise.all([
          this.prisma.commission.aggregate({
            where: { userId: u.id, status: 'PENDING' },
            _sum: { value: true },
            _count: true,
          }),
          this.prisma.commission.aggregate({
            where: { userId: u.id, status: 'RECEIVED' },
            _sum: { value: true },
            _count: true,
          }),
          this.prisma.commission.aggregate({
            where: { userId: u.id, status: 'PAID' },
            _sum: { value: true },
            _count: true,
          }),
        ]);

        return {
          user: u,
          pending: { count: pending._count, value: Number(pending._sum.value || 0) },
          received: { count: received._count, value: Number(received._sum.value || 0) },
          paid: { count: paid._count, value: Number(paid._sum.value || 0) },
        };
      }),
    );
  }
}
