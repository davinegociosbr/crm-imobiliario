import { Controller, Get, Put, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommissionsService } from './commissions.service';

@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private service: CommissionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.service.findAll(user.companyId, { userId, status, skip, take });
  }

  @Get('summary')
  getSummary(@CurrentUser() user: any) {
    return this.service.getSummaryByBroker(user.companyId);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: string; paidAt?: string },
  ) {
    return this.service.updateStatus(id, user.companyId, body.status, body.paidAt);
  }
}
