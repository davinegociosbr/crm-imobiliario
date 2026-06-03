import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const company = await prisma.company.create({
    data: {
      name: 'Davi Brolesi Negócios Imobiliários',
      email: 'davi.negociosbr@gmail.com',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  const senha = await bcrypt.hash('davi123', 10);

  const davi = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Davi Brolesi',
      email: 'davi.negociosbr@gmail.com',
      password: senha,
      role: 'ADMIN',
    },
  });

  // Imóveis de exemplo
  const properties = await Promise.all([
    prisma.property.create({
      data: {
        companyId: company.id,
        code: 'APT001',
        name: 'Residencial Harmonia - Bloco A',
        type: 'APARTMENT',
        city: 'São Paulo',
        neighborhood: 'Moema',
        address: 'Rua das Flores, 123',
        price: 850000,
        privateArea: 82,
        bedrooms: 3,
        suites: 1,
        parkingSpots: 2,
        developer: 'Construtora ABC',
        status: 'AVAILABLE',
      },
    }),
    prisma.property.create({
      data: {
        companyId: company.id,
        code: 'APT002',
        name: 'Edifício Parque Verde',
        type: 'APARTMENT',
        city: 'São Paulo',
        neighborhood: 'Jardins',
        address: 'Av. Paulista, 456',
        price: 1200000,
        privateArea: 110,
        bedrooms: 4,
        suites: 2,
        parkingSpots: 2,
        developer: 'Construtora XYZ',
        status: 'AVAILABLE',
      },
    }),
    prisma.property.create({
      data: {
        companyId: company.id,
        code: 'CASA001',
        name: 'Casa Alphaville Premium',
        type: 'HOUSE',
        city: 'Barueri',
        neighborhood: 'Alphaville',
        address: 'Alameda dos Ipês, 789',
        price: 2500000,
        privateArea: 320,
        bedrooms: 4,
        suites: 3,
        parkingSpots: 4,
        developer: 'Loteadora Prime',
        status: 'AVAILABLE',
      },
    }),
  ]);

  // Leads de exemplo
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: davi.id,
        name: 'Maria Oliveira',
        phone: '(11) 98888-1111',
        whatsapp: '(11) 98888-1111',
        email: 'maria@email.com',
        city: 'São Paulo',
        state: 'SP',
        investmentRange: 'R$ 800k - R$ 1M',
        interest: 'Apartamento 3 dormitórios',
        origin: 'INSTAGRAM',
        status: 'IN_PROGRESS',
        pipelineStage: 'ATTENDANCE',
        potentialValue: 850000,
      },
    }),
    prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: davi.id,
        name: 'Carlos Santos',
        phone: '(11) 97777-2222',
        whatsapp: '(11) 97777-2222',
        email: 'carlos@email.com',
        city: 'São Paulo',
        state: 'SP',
        investmentRange: 'R$ 1M - R$ 2M',
        interest: 'Casa ou apartamento grande',
        origin: 'REFERRAL',
        status: 'IN_PROGRESS',
        pipelineStage: 'FOLLOW_UP',
        potentialValue: 1200000,
      },
    }),
    prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: davi.id,
        name: 'Ana Ferreira',
        phone: '(11) 96666-3333',
        email: 'ana@email.com',
        city: 'Barueri',
        state: 'SP',
        investmentRange: 'R$ 2M+',
        interest: 'Casa em condomínio fechado',
        origin: 'GOOGLE',
        status: 'IN_PROGRESS',
        pipelineStage: 'CLIENTS',
        potentialValue: 2500000,
      },
    }),
    prisma.lead.create({
      data: {
        companyId: company.id,
        assignedUserId: davi.id,
        name: 'Pedro Lima',
        phone: '(11) 95555-4444',
        email: 'pedro@email.com',
        city: 'São Paulo',
        state: 'SP',
        investmentRange: 'R$ 500k - R$ 800k',
        origin: 'PORTAL_IMOVEIS',
        status: 'NEW',
        pipelineStage: 'INITIAL_CONTACT',
        potentialValue: 650000,
      },
    }),
  ]);

  // Atividades nos leads
  await Promise.all(
    leads.map((lead, i) =>
      prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: davi.id,
          type: ['CALL', 'WHATSAPP', 'MEETING', 'EMAIL'][i] as any,
          description: [
            'Primeiro contato realizado. Cliente interessado em apartamento.',
            'Enviou proposta por WhatsApp. Aguardando resposta.',
            'Reunião presencial agendada.',
            'E-mail de apresentação enviado.',
          ][i],
        },
      }),
    ),
  );

  // Tarefa de exemplo
  await prisma.task.create({
    data: {
      companyId: company.id,
      leadId: leads[0].id,
      assignedUserId: davi.id,
      createdByUserId: davi.id,
      title: 'Ligar para Maria Oliveira',
      description: 'Confirmar interesse no Residencial Harmonia',
      priority: 'HIGH',
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('📧 Credenciais de acesso:');
  console.log('   Davi Brolesi: davi.negociosbr@gmail.com / davi123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
