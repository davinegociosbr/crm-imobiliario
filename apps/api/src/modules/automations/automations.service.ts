import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.automation.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  async create(companyId: string, dto: any) {
    return this.prisma.automation.create({ data: { ...dto, companyId } });
  }

  async update(id: string, companyId: string, dto: any) {
    return this.prisma.automation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.automation.delete({ where: { id } });
    return { message: 'Automação removida' };
  }
}
