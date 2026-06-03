import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('leads')
  getLeads(@CurrentUser() user: any, @Query() filters: any) {
    return this.service.getLeadsReport(user.companyId, filters);
  }

  @Get('sales')
  getSales(@CurrentUser() user: any, @Query() filters: any) {
    return this.service.getSalesReport(user.companyId, filters);
  }

  @Get('visits')
  getVisits(@CurrentUser() user: any, @Query() filters: any) {
    return this.service.getVisitsReport(user.companyId, filters);
  }

  @Get('commissions')
  getCommissions(@CurrentUser() user: any, @Query() filters: any) {
    return this.service.getCommissionsReport(user.companyId, filters);
  }

  @Get('kpi')
  getKpi(@CurrentUser() user: any, @Query() filters: any) {
    return this.service.getKpiAdvanced(user.companyId, filters);
  }
}
