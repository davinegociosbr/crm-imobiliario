import { Controller, Get, Post, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private service: ExportService) {}

  @Get('backup-json')
  async downloadJson(@CurrentUser() user: any, @Res() res: Response) {
    const data = await this.service.getFullBackup(user.companyId);
    const filename = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('backup')
  async downloadExcel(@CurrentUser() user: any, @Res() res: Response) {
    const buffer = await this.service.buildExcel(user.companyId);
    const filename = `crm-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('import-leads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async importLeads(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    return this.service.importLeads(user.companyId, user.id, file);
  }

  @Get('import-template')
  downloadTemplate(@Res() res: Response) {
    const csv = 'Nome,Telefone,WhatsApp,Email,Cidade,Interesse,Origem,Etapa\n' +
      'João Silva,48999990000,48999990000,joao@email.com,Florianópolis,Apartamento 3 dorms,WHATSAPP,INITIAL_CONTACT\n';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao.csv"');
    res.send('﻿' + csv); // BOM para Excel reconhecer UTF-8
  }
}
