import { Controller, Post, UseGuards } from '@nestjs/common';
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
  sendNow(@CurrentUser() user: any) {
    return this.backupService.sendManualBackup(user.companyId, user.company?.name || 'CRM');
  }
}
