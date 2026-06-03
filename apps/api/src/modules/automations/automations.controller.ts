import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutomationsService } from './automations.service';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private service: AutomationsService) {}

  @Get()
  findAll(@CurrentUser() user: any) { return this.service.findAll(user.companyId); }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: any) { return this.service.create(user.companyId, dto); }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) { return this.service.update(id, user.companyId, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
