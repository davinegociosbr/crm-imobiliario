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
    const company = await this.prisma.company.findFirst({
      where: { settings: { path: ['formSlug'], equals: slug } },
      select: { id: true, settings: true },
    });
    if (!company) throw new NotFoundException('Formulário não encontrado');

    if (!dto.name || !dto.phone) throw new BadRequestException('Nome e telefone são obrigatórios');

    const settings: any = company.settings || {};
    const assignedUserId: string | null = settings.formAssignedUserId || null;

    const lead = await this.prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: assignedUserId || undefined,
        name: String(dto.name).trim(),
        phone: String(dto.phone).replace(/\D/g, ''),
        whatsapp: dto.whatsapp ? String(dto.whatsapp).replace(/\D/g, '') : String(dto.phone).replace(/\D/g, ''),
        email: dto.email || null,
        interest: dto.interest || null,
        city: dto.city || null,
        origin: dto.origin || 'OTHER',
        notes: dto.notes || null,
        status: 'NEW',
        pipelineStage: 'INITIAL_CONTACT',
      },
    });

    return { success: true, message: settings.formThankYou || 'Cadastro realizado com sucesso!' };
  }
}
