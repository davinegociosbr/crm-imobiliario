import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { VisitsModule } from './modules/visits/visits.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SalesModule } from './modules/sales/sales.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { AuditModule } from './modules/audit/audit.module';
import { ExportModule } from './modules/export/export.module';
import { BackupModule } from './modules/backup/backup.module';
import { PushModule } from './modules/push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    LeadsModule,
    ActivitiesModule,
    TasksModule,
    PropertiesModule,
    VisitsModule,
    ProposalsModule,
    ReservationsModule,
    SalesModule,
    CommissionsModule,
    PipelineModule,
    DashboardModule,
    ReportsModule,
    AutomationsModule,
    AuditModule,
    ExportModule,
    BackupModule,
    PushModule,
  ],
})
export class AppModule {}
