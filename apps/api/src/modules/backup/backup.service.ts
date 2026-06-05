import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
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
      // Busca todas as empresas ativas
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
    const smtpUser  = process.env.SMTP_USER;
    const smtpPass  = process.env.SMTP_PASS;

    if (!backupEmail || !smtpUser || !smtpPass) {
      this.logger.warn('Variáveis de e-mail não configuradas (BACKUP_EMAIL, SMTP_USER, SMTP_PASS)');
      return;
    }

    // Gera o Excel
    const buffer = await this.exportService.buildExcel(companyId);
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const filename = `backup-crm-${date}.xlsx`;

    // Configura transporte SMTP (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Conta de leads para incluir no corpo
    const totalLeads = await this.prisma.lead.count({ where: { companyId } });

    await transporter.sendMail({
      from: `"CRM Brolezi Backup" <${smtpUser}>`,
      to: backupEmail,
      subject: `📦 Backup diário CRM — ${date}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:white;margin:0">🏢 CRM Brolezi — Backup Diário</h2>
          </div>
          <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
            <p style="color:#334155">Olá, Davi!</p>
            <p style="color:#334155">Seu backup diário foi gerado com sucesso.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#eff6ff">
                <td style="padding:8px 12px;color:#1e40af;font-weight:bold">📅 Data</td>
                <td style="padding:8px 12px;color:#334155">${date}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;color:#1e40af;font-weight:bold">👥 Total de Leads</td>
                <td style="padding:8px 12px;color:#334155">${totalLeads}</td>
              </tr>
              <tr style="background:#eff6ff">
                <td style="padding:8px 12px;color:#1e40af;font-weight:bold">📎 Arquivo</td>
                <td style="padding:8px 12px;color:#334155">${filename}</td>
              </tr>
            </table>
            <p style="color:#64748b;font-size:13px">O arquivo Excel em anexo contém todos os seus leads, notas, atividades e dados do CRM.</p>
            <p style="color:#64748b;font-size:12px;margin-top:16px">Este e-mail é gerado automaticamente todo dia às 04:00 (horário de Brasília).</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: buffer as any,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    this.logger.log(`Backup enviado para ${backupEmail}`);
  }

  // Método para disparar backup manual (via endpoint)
  async sendManualBackup(companyId: string, companyName: string) {
    await this.sendBackupForCompany(companyId, companyName);
    return { message: 'Backup enviado com sucesso para o e-mail configurado' };
  }
}
