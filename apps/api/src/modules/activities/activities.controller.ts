import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private service: ActivitiesService) {}

  @Get('recent')
  findRecent(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.service.findRecent(user.companyId, limit);
  }

  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string, @CurrentUser() user: any) {
    return this.service.findByLead(leadId, user.companyId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.create(user.companyId, user.id, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/toggle-completed')
  toggleCompleted(@Param('id') id: string) {
    return this.service.toggleCompleted(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
