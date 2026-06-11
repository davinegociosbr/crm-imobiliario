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
    const data: any = {
      companyId,
      code: dto.code,
      name: dto.name,
      type: dto.type || 'APARTMENT',
      city: dto.city,
      neighborhood: dto.neighborhood || null,
      address: dto.address || null,
      price: parseFloat(String(dto.price)) || 0,
      privateArea: dto.privateArea != null && dto.privateArea !== '' ? parseFloat(String(dto.privateArea)) : null,
      bedrooms: dto.bedrooms != null && dto.bedrooms !== '' ? parseInt(String(dto.bedrooms), 10) : null,
      suites: dto.suites != null && dto.suites !== '' ? parseInt(String(dto.suites), 10) : null,
      parkingSpots: dto.parkingSpots != null && dto.parkingSpots !== '' ? parseInt(String(dto.parkingSpots), 10) : null,
      developer: dto.developer || null,
      description: dto.description || null,
    };
    return this.prisma.property.create({ data });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.neighborhood !== undefined) data.neighborhood = dto.neighborhood || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.price !== undefined) data.price = parseFloat(String(dto.price)) || 0;
    if (dto.privateArea !== undefined) data.privateArea = dto.privateArea !== '' && dto.privateArea != null ? parseFloat(String(dto.privateArea)) : null;
    if (dto.bedrooms !== undefined) data.bedrooms = dto.bedrooms !== '' && dto.bedrooms != null ? parseInt(String(dto.bedrooms), 10) : null;
    if (dto.suites !== undefined) data.suites = dto.suites !== '' && dto.suites != null ? parseInt(String(dto.suites), 10) : null;
    if (dto.parkingSpots !== undefined) data.parkingSpots = dto.parkingSpots !== '' && dto.parkingSpots != null ? parseInt(String(dto.parkingSpots), 10) : null;
    if (dto.developer !== undefined) data.developer = dto.developer || null;
    if (dto.description !== undefined) data.description = dto.description || null;
    return this.prisma.property.update({ where: { id }, data });
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
