import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private service: ReservationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.service.findAll(user.companyId, { status, skip, take });
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.create(user.companyId, user.id, dto);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body('status') status: string) {
    return this.service.updateStatus(id, user.companyId, status);
  }
}
