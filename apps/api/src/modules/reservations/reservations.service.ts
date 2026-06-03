import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { lead: { companyId } };
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
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
      this.prisma.reservation.count({ where }),
    ]);

    return { data, total };
  }

  async create(companyId: string, userId: string, dto: any) {
    const existing = await this.prisma.reservation.findFirst({
      where: { propertyId: dto.propertyId, status: 'ACTIVE' },
    });

    if (existing) {
      throw new BadRequestException('Imóvel já possui reserva ativa');
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        ...dto,
        userId: dto.userId || userId,
        expiresAt: new Date(dto.expiresAt),
      },
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    await Promise.all([
      this.prisma.property.update({ where: { id: dto.propertyId }, data: { status: 'RESERVED' } }),
      this.prisma.activity.create({
        data: {
          leadId: dto.leadId,
          userId,
          type: 'RESERVATION',
          description: `Reserva criada - válida até ${new Date(dto.expiresAt).toLocaleDateString('pt-BR')}`,
        },
      }),
    ]);

    return reservation;
  }

  async updateStatus(id: string, companyId: string, status: any) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id, lead: { companyId } } });
    if (!reservation) throw new NotFoundException('Reserva não encontrada');

    if (status === 'CANCELLED' || status === 'EXPIRED') {
      await this.prisma.property.update({
        where: { id: reservation.propertyId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.reservation.update({ where: { id }, data: { status } });
  }
}
