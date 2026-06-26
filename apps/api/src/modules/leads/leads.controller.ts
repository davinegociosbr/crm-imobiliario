import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadsService, CreateLeadDto, UpdateLeadDto } from './leads.service';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('origin') origin?: string,
    @Query('pipelineStage') pipelineStage?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('search') search?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.leadsService.findAll(user.companyId, {
      status, origin, pipelineStage, assignedUserId, search, skip, take, sortBy, sortDir,
    });
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.leadsService.getStats(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.findOne(id, user.companyId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(user.companyId, user.id, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, user.companyId, dto);
  }

  @Put(':id/pipeline-stage')
  updateStage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('stage') stage: any,
  ) {
    return this.leadsService.updatePipelineStage(id, user.companyId, stage, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.remove(id, user.companyId);
  }
}
