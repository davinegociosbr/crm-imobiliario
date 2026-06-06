import { Controller, Post, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  constructor(private backupService: BackupService) {}

  // Dispara backup manual por e-mail
  @Post('send-now')
  async sendNow(@CurrentUser() user: any) {
    try {
      return await this.backupService.sendManualBackup(user.companyId, user.company?.name || 'CRM');
    } catch (err: any) {
      throw new HttpException(
        err?.message || 'Erro ao enviar backup por e-mail',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
