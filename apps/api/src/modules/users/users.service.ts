import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, isActive: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(companyId: string, dto: any) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, companyId } });
    if (existing) throw new ConflictException('E-mail já cadastrado nesta empresa');

    const password = await bcrypt.hash(dto.password || 'Mudar@123', 10);
    return this.prisma.user.create({
      data: { ...dto, companyId, password },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
  }

  async update(id: string, companyId: string, dto: any) {
    await this.findOne(id, companyId);
    const { password, ...data } = dto;
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
  }

  async toggleActive(id: string, companyId: string) {
    const user = await this.findOne(id, companyId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !(user as any).isActive },
      select: { id: true, name: true, isActive: true },
    });
  }
}
