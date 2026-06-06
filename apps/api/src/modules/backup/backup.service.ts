import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Resend } from 'resend';
import { ExportService } from '../export/export.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private exportService: ExportService,
    private prisma: PrismaService,
  ) {}

  // Roda todo dia às 07:00 (horário UTC = 04:00 horário de Brasília)
  @Cron('0 7 * * *')
  async sendDailyBackup() {
    this.logger.log('Iniciando backup diário...');

    try {
      const companies = await this.prisma.company.findMany({
        select: { id: true, name: true },
      });

      for (const company of companies) {
        await this.sendBackupForCompany(company.id, company.name);
      }

      this.logger.log('Backup diário enviado com sucesso!');
    } catch (err) {
      this.logger.error('Erro no backup diário:', err);
    }
  }

  async sendBackupForCompany(companyId: string, companyName: string) {
    const backupEmail = process.env.BACKUP_EMAIL;
    const resendKey   = process.env.RESEND_API_KEY;

    if (!backupEmail || !resendKey) {
      this.logger.warn('Variáveis não configuradas (BACKUP_EMAIL, RESEND_API_KEY)');
      throw new Error('Variáveis BACKUP_EMAIL e RESEND_API_KEY não configuradas no servidor');
    }

    const resend = new Resend(resendKey);

    // Gera o Excel
    const buffer = await this.exportService.buildExcel(companyId);
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const filename = `backup-crm-${date}.xlsx`;

    // Conta de leads e busca contatos do dia
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const [totalLeads, overdueLeads, todayLeads] = await Promise.all([
      this.prisma.lead.count({ where: { companyId, status: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.lead.findMany({
        where: { companyId, nextContactAt: { lt: startOfDay }, status: { notIn: ['WON', 'LOST'] } },
        select: { id: true, name: true, phone: true, whatsapp: true, nextAction: true, nextContactAt: true },
        orderBy: { nextContactAt: 'asc' }, take: 10,
      }),
      this.prisma.lead.findMany({
        where: { companyId, nextContactAt: { gte: startOfDay, lte: endOfDay }, status: { notIn: ['WON', 'LOST'] } },
        select: { id: true, name: true, phone: true, whatsapp: true, nextAction: true, nextContactAt: true },
        orderBy: { nextContactAt: 'asc' }, take: 20,
      }),
    ]);

    const waMsg = encodeURIComponent('Olá, tudo bem? Passando para dar um retorno sobre o atendimento. Podemos conversar?');

    const renderLeadRow = (lead: any, overdue = false) => {
      const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
      const waLink = phone ? `https://web.whatsapp.com/send?phone=55${phone}&text=${waMsg}` : '';
      const dateStr = lead.nextContactAt ? new Date(lead.nextContactAt).toLocaleDateString('pt-BR') : '';
      return `
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 12px;color:#1e293b;font-weight:600">${lead.name}</td>
          <td style="padding:10px 12px;color:#475569">${lead.nextAction || '-'}</td>
          <td style="padding:10px 12px;color:${overdue ? '#dc2626' : '#2563eb'};font-size:12px">${overdue ? '⚠️ ' : '📅 '}${dateStr}</td>
          <td style="padding:10px 12px">
            ${waLink ? `<a href="${waLink}" style="background:#22c55e;color:white;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold">💬 WhatsApp</a>` : ''}
          </td>
        </tr>`;
    };

    const overdueSection = overdueLeads.length > 0 ? `
      <h3 style="color:#dc2626;margin:20px 0 8px">⚠️ Contatos Vencidos (${overdueLeads.length})</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#fef2f2">
          <th style="padding:8px 12px;text-align:left;color:#dc2626;font-size:12px">Cliente</th>
          <th style="padding:8px 12px;text-align:left;color:#dc2626;font-size:12px">Próxima Ação</th>
          <th style="padding:8px 12px;text-align:left;color:#dc2626;font-size:12px">Data</th>
          <th style="padding:8px 12px;text-align:left;color:#dc2626;font-size:12px">Contato</th>
        </tr></thead>
        <tbody>${overdueLeads.map(l => renderLeadRow(l, true)).join('')}</tbody>
      </table>` : '';

    const todaySection = todayLeads.length > 0 ? `
      <h3 style="color:#2563eb;margin:20px 0 8px">📅 Contatos de Hoje (${todayLeads.length})</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #bfdbfe;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#eff6ff">
          <th style="padding:8px 12px;text-align:left;color:#1d4ed8;font-size:12px">Cliente</th>
          <th style="padding:8px 12px;text-align:left;color:#1d4ed8;font-size:12px">Próxima Ação</th>
          <th style="padding:8px 12px;text-align:left;color:#1d4ed8;font-size:12px">Horário</th>
          <th style="padding:8px 12px;text-align:left;color:#1d4ed8;font-size:12px">Contato</th>
        </tr></thead>
        <tbody>${todayLeads.map(l => renderLeadRow(l, false)).join('')}</tbody>
      </table>` : '<p style="color:#64748b">✅ Nenhum contato agendado para hoje.</p>';

    const { error } = await resend.emails.send({
      from: 'CRM Brolezi <onboarding@resend.dev>',
      to: backupEmail,
      subject: `🗓️ Agenda do dia ${date} — ${todayLeads.length} contato(s) · ${overdueLeads.length} vencido(s)`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">🏢 CRM Brolezi — Agenda Diária</h2>
          </div>
          <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0">
            <p style="color:#334155">Olá, Davi! Aqui está seu resumo do dia <strong>${date}</strong>:</p>
            <div style="display:flex;gap:12px;margin:16px 0">
              <div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center">
                <p style="font-size:28px;font-weight:bold;color:#1e3a5f;margin:0">${totalLeads}</p>
                <p style="font-size:12px;color:#64748b;margin:4px 0 0">Total de Leads</p>
              </div>
              <div style="flex:1;background:white;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center">
                <p style="font-size:28px;font-weight:bold;color:#2563eb;margin:0">${todayLeads.length}</p>
                <p style="font-size:12px;color:#64748b;margin:4px 0 0">Contatos Hoje</p>
              </div>
              <div style="flex:1;background:white;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center">
                <p style="font-size:28px;font-weight:bold;color:#dc2626;margin:0">${overdueLeads.length}</p>
                <p style="font-size:12px;color:#64748b;margin:4px 0 0">Vencidos</p>
              </div>
            </div>
            ${overdueSection}
            ${todaySection}
            <p style="color:#64748b;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
              📎 O backup completo dos seus dados está em anexo.<br>
              Este e-mail é enviado automaticamente todo dia às 04:00 (horário de Brasília).
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: Buffer.from(buffer as any).toString('base64'),
        },
      ],
    });

    if (error) throw new Error(error.message);

    this.logger.log(`Backup enviado para ${backupEmail}`);
  }

  // Método para disparar backup manual (via endpoint)
  async sendManualBackup(companyId: string, companyName: string) {
    await this.sendBackupForCompany(companyId, companyName);
    return { message: 'Backup enviado com sucesso para o e-mail configurado' };
  }
}
