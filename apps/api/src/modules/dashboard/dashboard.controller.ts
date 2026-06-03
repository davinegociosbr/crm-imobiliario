import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@CurrentUser() user: any, @Query('period') period?: string) {
    return this.dashboardService.getMetrics(user.companyId, period);
  }

  @Get('sales-by-month')
  getSalesByMonth(@CurrentUser() user: any) {
    return this.dashboardService.getSalesByMonth(user.companyId);
  }

  @Get('leads-by-origin')
  getLeadsByOrigin(@CurrentUser() user: any) {
    return this.dashboardService.getLeadsByOrigin(user.companyId);
  }

  @Get('conversion-by-stage')
  getConversionByStage(@CurrentUser() user: any) {
    return this.dashboardService.getConversionByStage(user.companyId);
  }

  @Get('broker-performance')
  getBrokerPerformance(@CurrentUser() user: any) {
    return this.dashboardService.getBrokerPerformance(user.companyId);
  }
}
