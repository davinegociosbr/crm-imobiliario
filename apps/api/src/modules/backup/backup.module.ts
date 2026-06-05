import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { ExportModule } from '../export/export.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ExportModule, PrismaModule],
  providers: [BackupService],
  controllers: [BackupController],
})
export class BackupModule {}
