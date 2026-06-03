import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, filters: any = {}) {
    const where: any = { companyId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { developer: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.property.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, companyId: string) {
    const property = await this.prisma.property.findFirst({ where: { id, companyId } });
    if (!property) throw new NotFoundException('Imóvel não encontrado');
    return property;
  }

  async create(companyId: string, dto: any) {
    return this.prisma.property.create({ data: { ...dto, companyId } });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    return this.prisma.property.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.property.delete({ where: { id } });
    return { message: 'Imóvel removido' };
  }

  async updateStatus(id: string, companyId: string, status: any) {
    await this.findOne(id, companyId);
    return this.prisma.property.update({ where: { id }, data: { status } });
  }
}
