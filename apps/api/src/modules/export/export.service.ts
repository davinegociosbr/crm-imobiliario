import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

const ORIGIN_PT: Record<string, string> = {
  WEBSITE: 'Site', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook',
  GOOGLE: 'Google', REFERRAL: 'Indicação', PORTAL_IMOVEIS: 'Portal Imóveis',
  WHATSAPP: 'WhatsApp', PHONE: 'Telefone', EMAIL: 'E-mail',
  WALK_IN: 'Presencial', OTHER: 'Outro',
};

const STATUS_PT: Record<string, string> = {
  NEW: 'Novo', IN_PROGRESS: 'Em atendimento', QUALIFIED: 'Qualificado',
  NEGOTIATION: 'Negociação', CONTRACT: 'Contrato', WON: 'Ganhou', LOST: 'Perdeu',
};

const PIPELINE_PT: Record<string, string> = {
  INITIAL_CONTACT: 'Contato Inicial', REDIRECT: 'Redirecionar',
  ATTENDANCE: 'Atendimento', TODAY: 'Hoje', FOLLOW_UP: 'Follow-up',
  CLIENTS: 'Clientes', INACTIVE: 'Inativos',
};

const MARITAL_PT: Record<string, string> = {
  SINGLE: 'Solteiro(a)', MARRIED: 'Casado(a)', DIVORCED: 'Divorciado(a)',
  WIDOWED: 'Viúvo(a)', STABLE_UNION: 'União Estável',
};

const PROPERTY_TYPE_PT: Record<string, string> = {
  APARTMENT: 'Apartamento', HOUSE: 'Casa', COMMERCIAL: 'Comercial',
  LAND: 'Terreno', RURAL: 'Rural', OTHER: 'Outro',
};

const PROPERTY_STATUS_PT: Record<string, string> = {
  AVAILABLE: 'Disponível', RESERVED: 'Reservado', SOLD: 'Vendido', INACTIVE: 'Inativo',
};

const VISIT_STATUS_PT: Record<string, string> = {
  SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada', RESCHEDULED: 'Reagendada',
};

const PROPOSAL_STATUS_PT: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada', EXPIRED: 'Expirada', NEGOTIATING: 'Negociando',
};

const TASK_STATUS_PT: Record<string, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
};

const TASK_PRIORITY_PT: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};

const ACTIVITY_TYPE_PT: Record<string, string> = {
  CALL: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', MEETING: 'Reunião',
  VISIT: 'Visita', PROPOSAL: 'Proposta', RESERVATION: 'Reserva',
  CONTRACT: 'Contrato', NOTE: 'Nota', FOLLOW_UP: 'Follow-up',
};

const ptDate = (d: any) => d ? new Date(d).toLocaleDateString('pt-BR') : '';
const ptDateTime = (d: any) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const currency = (v: any) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

function styleHeader(sheet: ExcelJS.Worksheet, bgColor: string) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
  });
  headerRow.height = 28;
}

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 4, 50);
  });
}

function styleDataRows(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: false };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });
    row.height = 20;
  });
}

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async getFullBackup(companyId: string) {
    const [
      company, users, leads, properties, visits,
      proposals, reservations, sales, commissions, tasks, activities,
    ] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, cnpj: true, email: true, phone: true, address: true, city: true, state: true, website: true, plan: true, createdAt: true },
      }),
      this.prisma.user.findMany({ where: { companyId }, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true } }),
      this.prisma.lead.findMany({ where: { companyId }, include: { assignedUser: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.property.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.visit.findMany({ where: { lead: { companyId } }, include: { lead: { select: { id: true, name: true } }, property: { select: { id: true, name: true, code: true } }, user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.proposal.findMany({ where: { lead: { companyId } }, include: { lead: { select: { id: true, name: true } }, property: { select: { id: true, name: true, code: true } }, user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.reservation.findMany({ where: { lead: { companyId } }, include: { lead: { select: { id: true, name: true } }, property: { select: { id: true, name: true, code: true } }, user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.sale.findMany({ where: { lead: { companyId } }, include: { lead: { select: { id: true, name: true } }, property: { select: { id: true, name: true, code: true } }, user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.commission.findMany({ where: { sale: { lead: { companyId } } }, include: { sale: { select: { id: true } }, user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.task.findMany({ where: { companyId }, include: { assignedUser: { select: { id: true, name: true } }, lead: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.activity.findMany({ where: { lead: { companyId } }, include: { user: { select: { id: true, name: true } }, lead: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      source: 'CRM Imobiliário',
      company,
      summary: {
        users: users.length, leads: leads.length, properties: properties.length,
        visits: visits.length, proposals: proposals.length, reservations: reservations.length,
        sales: sales.length, commissions: commissions.length, tasks: tasks.length, activities: activities.length,
      },
      data: { users, leads, properties, visits, proposals, reservations, sales, commissions, tasks, activities },
    };
  }

  async buildExcel(companyId: string): Promise<ExcelJS.Buffer> {
    // Carrega labels customizadas de etapas do funil da empresa
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { settings: true } });
    const settings: any = company?.settings || {};
    const stageLabels: Record<string, string> = settings.stageLabels || {};
    const customStages: { key: string; label: string }[] = settings.customPipelineStages || [];

    const getPipelineLabel = (stage: string): string => {
      if (stageLabels[stage]) return stageLabels[stage];
      if (PIPELINE_PT[stage]) return PIPELINE_PT[stage];
      const custom = customStages.find(c => c.key === stage);
      if (custom) return custom.label;
      return stage;
    };

    const [allLeads, properties, visits, proposals, reservations, sales, commissions, tasks, activities, financialEntries] = await Promise.all([
      this.prisma.lead.findMany({ where: { companyId }, include: { assignedUser: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.property.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.visit.findMany({ where: { lead: { companyId } }, include: { lead: { select: { name: true } }, property: { select: { name: true, code: true } }, user: { select: { name: true } } }, orderBy: { scheduledAt: 'asc' } }),
      this.prisma.proposal.findMany({ where: { lead: { companyId } }, include: { lead: { select: { name: true } }, property: { select: { name: true, code: true } }, user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.reservation.findMany({ where: { lead: { companyId } }, include: { lead: { select: { name: true } }, property: { select: { name: true, code: true } }, user: { select: { name: true } } }, orderBy: { reservedAt: 'asc' } }),
      this.prisma.sale.findMany({ where: { lead: { companyId } }, include: { lead: { select: { name: true } }, property: { select: { name: true, code: true } }, user: { select: { name: true } } }, orderBy: { soldAt: 'asc' } }),
      this.prisma.commission.findMany({ where: { sale: { lead: { companyId } } }, include: { sale: { include: { lead: { select: { name: true } }, property: { select: { name: true } } } }, user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.task.findMany({ where: { companyId }, include: { assignedUser: { select: { name: true } }, lead: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.activity.findMany({ where: { lead: { companyId } }, include: { user: { select: { name: true } }, lead: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.financialEntry.findMany({ where: { companyId }, orderBy: { dueDate: 'asc' } }),
    ]);

    // Deduplica leads por telefone (mantém o mais recente de cada número)
    const seenPhones = new Set<string>();
    const leads = allLeads.filter((l) => {
      const phone = (l.whatsapp || l.phone || '').replace(/\D/g, '');
      if (!phone || seenPhones.has(phone)) return false;
      seenPhones.add(phone);
      return true;
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CRM Imobiliário';
    wb.created = new Date();

    // ── ABA 1: FUNIL DE VENDAS ────────────────────────────────────────────────
    const PIPELINE_ORDER = ['INITIAL_CONTACT', 'REDIRECT', 'ATTENDANCE', 'TODAY', 'FOLLOW_UP', 'CLIENTS', 'INACTIVE'];
    // Sem deduplicação: cada card do funil é um negócio independente
    const funilLeads = allLeads
      .filter((l) => !['WON', 'LOST'].includes(l.status))
      .sort((a, b) => PIPELINE_ORDER.indexOf(a.pipelineStage) - PIPELINE_ORDER.indexOf(b.pipelineStage));

    const wsFunil = wb.addWorksheet('Funil de Vendas', { properties: { tabColor: { argb: 'FF0EA5E9' } } });
    wsFunil.columns = [
      { header: 'Etapa do Funil',         key: 'stage' },
      { header: 'Nome',                   key: 'name' },
      { header: 'Telefone',               key: 'phone' },
      { header: 'WhatsApp',               key: 'whatsapp' },
      { header: 'Interesse',              key: 'interest' },
      { header: 'Valor Potencial (R$)',   key: 'potentialValue' },
      { header: 'Origem',                 key: 'origin' },
      { header: 'Próxima Ação',           key: 'nextAction' },
      { header: 'Data Próximo Contato',   key: 'nextContactAt' },
      { header: 'Corretor',               key: 'broker' },
      { header: 'Cidade',                 key: 'city' },
      { header: 'Cadastro',               key: 'createdAt' },
    ];
    funilLeads.forEach((l) => wsFunil.addRow({
      stage: getPipelineLabel(l.pipelineStage),
      name: l.name,
      phone: l.phone,
      whatsapp: l.whatsapp || '',
      interest: l.interest || '',
      potentialValue: currency(l.potentialValue),
      origin: ORIGIN_PT[l.origin] || l.origin,
      nextAction: l.nextAction || '',
      nextContactAt: ptDate(l.nextContactAt),
      broker: l.assignedUser?.name || '',
      city: l.city || '',
      createdAt: ptDate(l.createdAt),
    }));
    styleHeader(wsFunil, 'FF0EA5E9');
    styleDataRows(wsFunil);
    autoWidth(wsFunil);

    // ── ABA 2: LEADS ──────────────────────────────────────────────────────────
    const wsLeads = wb.addWorksheet('Leads', { properties: { tabColor: { argb: 'FF2563EB' } } });
    wsLeads.columns = [
      { header: 'Nome',               key: 'name' },
      { header: 'Telefone',           key: 'phone' },
      { header: 'WhatsApp',           key: 'whatsapp' },
      { header: 'E-mail',             key: 'email' },
      { header: 'CPF',                key: 'cpf' },
      { header: 'Cidade',             key: 'city' },
      { header: 'Estado',             key: 'state' },
      { header: 'Faixa de Investimento', key: 'investmentRange' },
      { header: 'Faixa de Renda',     key: 'incomeRange' },
      { header: 'Interesse',          key: 'interest' },
      { header: 'Valor Potencial (R$)', key: 'potentialValue' },
      { header: 'Origem',             key: 'origin' },
      { header: 'Status',             key: 'status' },
      { header: 'Etapa do Funil',     key: 'pipeline' },
      { header: 'Próxima Ação',       key: 'nextAction' },
      { header: 'Data Próximo Contato', key: 'nextContactAt' },
      { header: 'Motivo de Perda',    key: 'lostReason' },
      { header: 'Corretor',           key: 'broker' },
      { header: 'Observações',        key: 'notes' },
      { header: 'Cadastro',           key: 'createdAt' },
    ];
    leads.forEach((l) => wsLeads.addRow({
      name: l.name, phone: l.phone, whatsapp: l.whatsapp || '',
      email: l.email || '', cpf: l.cpf || '', city: l.city || '', state: l.state || '',
      investmentRange: l.investmentRange || '', incomeRange: l.incomeRange || '',
      interest: l.interest || '', potentialValue: currency(l.potentialValue),
      origin: ORIGIN_PT[l.origin] || l.origin,
      status: STATUS_PT[l.status] || l.status,
      pipeline: getPipelineLabel(l.pipelineStage),
      nextAction: l.nextAction || '', nextContactAt: ptDate(l.nextContactAt),
      lostReason: l.lostReason || '', broker: l.assignedUser?.name || '',
      notes: l.notes || '', createdAt: ptDate(l.createdAt),
    }));
    styleHeader(wsLeads, 'FF2563EB');
    styleDataRows(wsLeads);
    autoWidth(wsLeads);

    // ── ABA 2: IMÓVEIS ────────────────────────────────────────────────────────
    const wsProps = wb.addWorksheet('Imóveis', { properties: { tabColor: { argb: 'FF7C3AED' } } });
    wsProps.columns = [
      { header: 'Código',        key: 'code' },
      { header: 'Nome',          key: 'name' },
      { header: 'Tipo',          key: 'type' },
      { header: 'Status',        key: 'status' },
      { header: 'Cidade',        key: 'city' },
      { header: 'Bairro',        key: 'neighborhood' },
      { header: 'Endereço',      key: 'address' },
      { header: 'Preço (R$)',    key: 'price' },
      { header: 'Área Privativa (m²)', key: 'privateArea' },
      { header: 'Quartos',       key: 'bedrooms' },
      { header: 'Suítes',        key: 'suites' },
      { header: 'Vagas',         key: 'parkingSpots' },
      { header: 'Construtora',   key: 'developer' },
      { header: 'Descrição',     key: 'description' },
      { header: 'Cadastro',      key: 'createdAt' },
    ];
    properties.forEach((p) => wsProps.addRow({
      code: p.code, name: p.name,
      type: PROPERTY_TYPE_PT[p.type] || p.type,
      status: PROPERTY_STATUS_PT[p.status] || p.status,
      city: p.city, neighborhood: p.neighborhood || '', address: p.address || '',
      price: currency(p.price), privateArea: p.privateArea ? Number(p.privateArea) : '',
      bedrooms: p.bedrooms ?? '', suites: p.suites ?? '', parkingSpots: p.parkingSpots ?? '',
      developer: p.developer || '', description: p.description || '',
      createdAt: ptDate(p.createdAt),
    }));
    styleHeader(wsProps, 'FF7C3AED');
    styleDataRows(wsProps);
    autoWidth(wsProps);

    // ── ABA 3: VISITAS ────────────────────────────────────────────────────────
    const wsVisits = wb.addWorksheet('Visitas', { properties: { tabColor: { argb: 'FF0891B2' } } });
    wsVisits.columns = [
      { header: 'Lead / Cliente',  key: 'lead' },
      { header: 'Imóvel',          key: 'property' },
      { header: 'Código Imóvel',   key: 'propertyCode' },
      { header: 'Corretor',        key: 'broker' },
      { header: 'Data e Hora',     key: 'scheduledAt' },
      { header: 'Status',          key: 'status' },
      { header: 'Endereço',        key: 'address' },
      { header: 'Observações',     key: 'notes' },
      { header: 'Feedback',        key: 'feedback' },
    ];
    visits.forEach((v) => wsVisits.addRow({
      lead: v.lead?.name || '', property: v.property?.name || '',
      propertyCode: v.property?.code || '',
      broker: v.user?.name || '',
      scheduledAt: ptDateTime(v.scheduledAt),
      status: VISIT_STATUS_PT[v.status] || v.status,
      address: v.address || '', notes: v.notes || '', feedback: v.feedback || '',
    }));
    styleHeader(wsVisits, 'FF0891B2');
    styleDataRows(wsVisits);
    autoWidth(wsVisits);

    // ── ABA 4: PROPOSTAS ──────────────────────────────────────────────────────
    const wsProposals = wb.addWorksheet('Propostas', { properties: { tabColor: { argb: 'FFF59E0B' } } });
    wsProposals.columns = [
      { header: 'Lead / Cliente',   key: 'lead' },
      { header: 'Imóvel',           key: 'property' },
      { header: 'Código Imóvel',    key: 'propertyCode' },
      { header: 'Corretor',         key: 'broker' },
      { header: 'Valor Imóvel (R$)', key: 'propertyValue' },
      { header: 'Entrada (R$)',     key: 'downPayment' },
      { header: 'Parcelas',         key: 'installments' },
      { header: 'Valor Parcela (R$)', key: 'installmentValue' },
      { header: 'Status',           key: 'status' },
      { header: 'Validade',         key: 'expiresAt' },
      { header: 'Observações',      key: 'notes' },
      { header: 'Data',             key: 'createdAt' },
    ];
    proposals.forEach((p) => wsProposals.addRow({
      lead: p.lead?.name || '', property: p.property?.name || '',
      propertyCode: p.property?.code || '', broker: p.user?.name || '',
      propertyValue: currency(p.propertyValue), downPayment: currency(p.downPayment),
      installments: p.installments ?? '', installmentValue: currency(p.installmentValue),
      status: PROPOSAL_STATUS_PT[p.status] || p.status,
      expiresAt: ptDate(p.expiresAt), notes: p.notes || '', createdAt: ptDate(p.createdAt),
    }));
    styleHeader(wsProposals, 'FFF59E0B');
    styleDataRows(wsProposals);
    autoWidth(wsProposals);

    // ── ABA 5: VENDAS ─────────────────────────────────────────────────────────
    const wsSales = wb.addWorksheet('Vendas', { properties: { tabColor: { argb: 'FF16A34A' } } });
    wsSales.columns = [
      { header: 'Lead / Cliente',     key: 'lead' },
      { header: 'Imóvel',             key: 'property' },
      { header: 'Código Imóvel',      key: 'propertyCode' },
      { header: 'Corretor',           key: 'broker' },
      { header: 'Valor da Venda (R$)', key: 'saleValue' },
      { header: 'Comissão (%)',        key: 'commissionPercent' },
      { header: 'Comissão (R$)',       key: 'commissionValue' },
      { header: 'Status',             key: 'status' },
      { header: 'Data da Venda',      key: 'soldAt' },
      { header: 'Observações',        key: 'notes' },
    ];
    sales.forEach((s) => wsSales.addRow({
      lead: s.lead?.name || '', property: s.property?.name || '',
      propertyCode: s.property?.code || '', broker: s.user?.name || '',
      saleValue: currency(s.saleValue),
      commissionPercent: Number(s.commissionPercent).toFixed(2) + '%',
      commissionValue: currency(s.commissionValue),
      status: s.status === 'ACTIVE' ? 'Ativa' : s.status === 'COMPLETED' ? 'Concluída' : 'Cancelada',
      soldAt: ptDate(s.soldAt), notes: s.notes || '',
    }));
    styleHeader(wsSales, 'FF16A34A');
    styleDataRows(wsSales);
    autoWidth(wsSales);

    // ── ABA 6: COMISSÕES ──────────────────────────────────────────────────────
    const wsComm = wb.addWorksheet('Comissões', { properties: { tabColor: { argb: 'FFEA580C' } } });
    wsComm.columns = [
      { header: 'Corretor',          key: 'broker' },
      { header: 'Lead / Cliente',    key: 'lead' },
      { header: 'Imóvel',            key: 'property' },
      { header: 'Percentual (%)',    key: 'percent' },
      { header: 'Valor (R$)',        key: 'value' },
      { header: 'Status',           key: 'status' },
      { header: 'Data Pagamento',   key: 'paidAt' },
      { header: 'Observações',      key: 'notes' },
    ];
    commissions.forEach((c) => wsComm.addRow({
      broker: c.user?.name || '',
      lead: (c.sale as any)?.lead?.name || '',
      property: (c.sale as any)?.property?.name || '',
      percent: Number(c.percent).toFixed(2) + '%',
      value: currency(c.value),
      status: c.status === 'PENDING' ? 'Pendente' : c.status === 'RECEIVED' ? 'Recebida' : 'Paga',
      paidAt: ptDate(c.paidAt), notes: c.notes || '',
    }));
    styleHeader(wsComm, 'FFEA580C');
    styleDataRows(wsComm);
    autoWidth(wsComm);

    // ── ABA 7: TAREFAS ────────────────────────────────────────────────────────
    const wsTasks = wb.addWorksheet('Tarefas', { properties: { tabColor: { argb: 'FF6366F1' } } });
    wsTasks.columns = [
      { header: 'Título',         key: 'title' },
      { header: 'Descrição',      key: 'description' },
      { header: 'Lead Vinculado', key: 'lead' },
      { header: 'Responsável',    key: 'assignedUser' },
      { header: 'Prioridade',     key: 'priority' },
      { header: 'Status',        key: 'status' },
      { header: 'Prazo',         key: 'dueAt' },
      { header: 'Concluída em',  key: 'completedAt' },
      { header: 'Cadastro',      key: 'createdAt' },
    ];
    tasks.forEach((t) => wsTasks.addRow({
      title: t.title, description: t.description || '',
      lead: t.lead?.name || '', assignedUser: t.assignedUser?.name || '',
      priority: TASK_PRIORITY_PT[t.priority] || t.priority,
      status: TASK_STATUS_PT[t.status] || t.status,
      dueAt: ptDate(t.dueAt), completedAt: ptDate(t.completedAt), createdAt: ptDate(t.createdAt),
    }));
    styleHeader(wsTasks, 'FF6366F1');
    styleDataRows(wsTasks);
    autoWidth(wsTasks);

    // ── ABA 8: HISTÓRICO DE NOTAS ─────────────────────────────────────────────
    const wsAct = wb.addWorksheet('Histórico de Notas', { properties: { tabColor: { argb: 'FF0F172A' } } });
    wsAct.columns = [
      { header: 'Lead / Cliente',      key: 'lead' },
      { header: 'Tipo',                key: 'type' },
      { header: 'Descrição',           key: 'description' },
      { header: 'Próxima Ação',        key: 'nextAction' },
      { header: 'Data Próximo Contato', key: 'nextContactAt' },
      { header: 'Observações',         key: 'notes' },
      { header: 'Concluído',           key: 'isCompleted' },
      { header: 'Registrado por',      key: 'user' },
      { header: 'Data',                key: 'createdAt' },
    ];
    activities.forEach((a) => wsAct.addRow({
      lead: (a as any).lead?.name || '', type: ACTIVITY_TYPE_PT[a.type] || a.type,
      description: a.description, nextAction: a.nextAction || '',
      nextContactAt: ptDate(a.nextContactAt), notes: (a as any).notes || '',
      isCompleted: (a as any).isCompleted ? 'Sim' : 'Não',
      user: a.user?.name || '', createdAt: ptDateTime(a.createdAt),
    }));
    styleHeader(wsAct, 'FF0F172A');
    styleDataRows(wsAct);
    autoWidth(wsAct);

    // ── ABA 9: FINANCEIRO ────────────────────────────────────────────────────
    const FINANCIAL_TYPE_PT: Record<string, string> = { RECEIVABLE: 'A Receber', PAYABLE: 'A Pagar' };
    const FINANCIAL_STATUS_PT: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' };
    const FINANCIAL_CATEGORY_PT: Record<string, string> = {
      COMMISSION: 'Comissão', RENT: 'Aluguel', SALE: 'Venda', SERVICE: 'Serviço',
      TAX: 'Imposto', SALARY: 'Salário', MARKETING: 'Marketing', INFRASTRUCTURE: 'Infraestrutura', OTHER: 'Outros',
    };

    const wsFinancial = wb.addWorksheet('Financeiro', { properties: { tabColor: { argb: 'FF16A34A' } } });
    wsFinancial.columns = [
      { header: 'Tipo',        key: 'type' },
      { header: 'Categoria',   key: 'category' },
      { header: 'Descrição',   key: 'description' },
      { header: 'Contato',     key: 'contactName' },
      { header: 'Valor (R$)', key: 'amount' },
      { header: 'Vencimento',  key: 'dueDate' },
      { header: 'Status',      key: 'status' },
      { header: 'Pago em',     key: 'paidAt' },
      { header: 'Observações', key: 'notes' },
      { header: 'Cadastro',    key: 'createdAt' },
    ];
    financialEntries.forEach((f) => wsFinancial.addRow({
      type: FINANCIAL_TYPE_PT[f.type] || f.type,
      category: FINANCIAL_CATEGORY_PT[f.category] || f.category,
      description: f.description,
      contactName: f.contactName || '',
      amount: currency(f.amount),
      dueDate: ptDate(f.dueDate),
      status: FINANCIAL_STATUS_PT[f.status] || f.status,
      paidAt: ptDate(f.paidAt),
      notes: f.notes || '',
      createdAt: ptDate(f.createdAt),
    }));
    styleHeader(wsFinancial, 'FF059669');
    styleDataRows(wsFinancial);
    autoWidth(wsFinancial);

    return wb.xlsx.writeBuffer();
  }

  // ─── Importação de leads via CSV ou XLSX ──────────────────────────────────────
  async importLeads(companyId: string, userId: string, file: Express.Multer.File) {
    const rows: Record<string, string>[] = [];
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // Lê Excel
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(file.buffer as any);
      const ws = wb.worksheets[0];
      const headers: string[] = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => headers.push(String(cell.value || '').trim()));
        } else {
          const obj: Record<string, string> = {};
          row.eachCell((cell, colNumber) => {
            obj[headers[colNumber - 1]] = String(cell.value || '').trim();
          });
          rows.push(obj);
        }
      });
    } else {
      // Lê CSV
      const text = file.buffer.toString('utf-8').replace(/^﻿/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = (values[idx] || '').trim(); });
        rows.push(obj);
      }
    }

    // Mapeamento de colunas (suporta nomes em PT e EN)
    const get = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
        if (found && row[found]) return row[found];
      }
      return '';
    };

    const VALID_ORIGINS = ['WEBSITE','INSTAGRAM','FACEBOOK','GOOGLE','REFERRAL','PORTAL_IMOVEIS','WHATSAPP','PHONE','EMAIL','WALK_IN','OTHER'];
    const VALID_STAGES  = ['INITIAL_CONTACT','REDIRECT','ATTENDANCE','TODAY','FOLLOW_UP','CLIENTS','INACTIVE'];

    let created = 0, skipped = 0, errors: string[] = [];

    for (const row of rows) {
      const name  = get(row, 'Nome', 'Name', 'nome');
      const phone = get(row, 'Telefone', 'Phone', 'telefone')?.replace(/\D/g, '');
      if (!name || !phone) { skipped++; continue; }

      const origin = VALID_ORIGINS.includes(get(row, 'Origem', 'Origin', 'origem'))
        ? get(row, 'Origem', 'Origin', 'origem') as any
        : 'OTHER';
      const pipelineStage = VALID_STAGES.includes(get(row, 'Etapa', 'Stage', 'etapa'))
        ? get(row, 'Etapa', 'Stage', 'etapa') as any
        : 'INITIAL_CONTACT';

      try {
        // Evita duplicata por telefone
        const existing = await this.prisma.lead.findFirst({ where: { companyId, phone } });
        if (existing) { skipped++; continue; }

        await this.prisma.lead.create({
          data: {
            companyId,
            assignedUserId: userId,
            name,
            phone,
            whatsapp: get(row, 'WhatsApp', 'whatsapp') || phone,
            email:    get(row, 'Email', 'E-mail', 'email') || null,
            city:     get(row, 'Cidade', 'City', 'cidade') || null,
            interest: get(row, 'Interesse', 'Interest', 'interesse') || null,
            origin,
            pipelineStage,
          },
        });
        created++;
      } catch (e) {
        errors.push(`${name}: ${(e as any).message}`);
      }
    }

    return { created, skipped, errors: errors.slice(0, 10), total: rows.length };
  }
}
