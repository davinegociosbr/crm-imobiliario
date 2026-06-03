import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PipelineService } from './pipeline.service';

@ApiTags('Pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private service: PipelineService) {}

  @Get('kanban')
  getKanban(@CurrentUser() user: any, @Query('assignedUserId') assignedUserId?: string) {
    return this.service.getKanban(user.companyId, { assignedUserId });
  }

  @Put(':leadId/move')
  moveCard(
    @Param('leadId') leadId: string,
    @CurrentUser() user: any,
    @Body('stage') stage: string,
  ) {
    return this.service.moveCard(leadId, user.companyId, stage, user.id);
  }
}
