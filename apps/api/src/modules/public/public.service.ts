import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getFormConfig(slug: string) {
    const company = await this.prisma.company.findFirst({
      where: { settings: { path: ['formSlug'], equals: slug } },
      select: {
        id: true, name: true, logo: true,
        settings: true,
      },
    });
    if (!company) throw new NotFoundException('Formulário não encontrado');

    const settings: any = company.settings || {};
    return {
      companyName: company.name,
      logo: company.logo,
      title: settings.formTitle || `Cadastre seu interesse — ${company.name}`,
      subtitle: settings.formSubtitle || 'Preencha seus dados e entraremos em contato.',
      primaryColor: settings.formColor || '#2563eb',
      fields: settings.formFields || ['name', 'phone', 'whatsapp', 'email', 'interest', 'origin'],
      thankYouMessage: settings.formThankYou || 'Obrigado! Entraremos em contato em breve.',
    };
  }

  async submitLead(slug: string, dto: any) {
    // Honeypot: campo invisível que só bots preenchem — finge sucesso sem criar o lead
    if (dto._hp) {
      return { success: true, message: 'Cadastro realizado com sucesso!' };
    }

    const company = await this.prisma.company.findFirst({
      where: { settings: { path: ['formSlug'], equals: slug } },
      select: { id: true, settings: true },
    });
    if (!company) throw new NotFoundException('Formulário não encontrado');

    const name = String(dto.name || '').trim();
    const phoneDigits = String(dto.phone || '').replace(/\D/g, '');
    if (!name || !phoneDigits) throw new BadRequestException('Nome e telefone são obrigatórios');
    if (name.length > 150) throw new BadRequestException('Nome muito longo');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) throw new BadRequestException('Telefone inválido');
    if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dto.email))) {
      throw new BadRequestException('E-mail inválido');
    }

    const capped = (v: unknown, max: number) => (v ? String(v).trim().slice(0, max) : null);
    const whatsappDigits = dto.whatsapp ? String(dto.whatsapp).replace(/\D/g, '') : phoneDigits;

    const settings: any = company.settings || {};
    const assignedUserId: string | null = settings.formAssignedUserId || null;

    const lead = await this.prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: assignedUserId || undefined,
        name,
        phone: phoneDigits,
        whatsapp: whatsappDigits,
        email: capped(dto.email, 150),
        interest: capped(dto.interest, 300),
        city: capped(dto.city, 100),
        origin: dto.origin || 'OTHER',
        notes: capped(dto.notes, 1000),
        status: 'NEW',
        pipelineStage: 'INITIAL_CONTACT',
      },
    });

    return { success: true, message: settings.formThankYou || 'Cadastro realizado com sucesso!' };
  }
}
