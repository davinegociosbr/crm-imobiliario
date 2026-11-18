import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';

// Cobre o endpoint público de captação de leads (sem autenticação, exposto a
// qualquer site/bot) — a validação e o honeypot aqui são a única defesa contra
// spam/abuso, então uma regressão silenciosa nessa regra tem impacto direto.
describe('PublicService.submitLead', () => {
  let service: PublicService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      company: { findFirst: jest.fn() },
      lead: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [PublicService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PublicService);
  });

  it('finge sucesso sem criar lead quando o honeypot está preenchido (bot)', async () => {
    const result = await service.submitLead('empresa', {
      name: 'Bot', phone: '11999999999', _hp: 'preenchido-por-bot',
    });

    expect(result.success).toBe(true);
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it('rejeita quando o formulário (slug) não existe', async () => {
    prisma.company.findFirst.mockResolvedValue(null);
    await expect(
      service.submitLead('inexistente', { name: 'João', phone: '11999999999' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita sem nome ou sem telefone', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'c1', settings: {} });
    await expect(
      service.submitLead('empresa', { name: '', phone: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita telefone com quantidade de dígitos inválida', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'c1', settings: {} });
    await expect(
      service.submitLead('empresa', { name: 'João', phone: '123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita e-mail em formato inválido', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'c1', settings: {} });
    await expect(
      service.submitLead('empresa', { name: 'João', phone: '11999999999', email: 'não-é-email' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cria o lead com os dados limpos quando tudo é válido', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'c1', settings: { formThankYou: 'Obrigado!' } });
    prisma.lead.create.mockResolvedValue({ id: 'lead-1' });

    const result = await service.submitLead('empresa', {
      name: '  João Silva  ',
      phone: '(11) 99999-9999',
      email: 'joao@example.com',
    });

    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'c1',
          name: 'João Silva',
          phone: '11999999999',
          whatsapp: '11999999999',
        }),
      }),
    );
    expect(result).toEqual({ success: true, message: 'Obrigado!' });
  });
});
