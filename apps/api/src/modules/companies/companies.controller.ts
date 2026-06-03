import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompaniesController {
  constructor(private service: CompaniesService) {}

  @Get()
  findOne(@CurrentUser() user: any) {
    return this.service.findOne(user.companyId);
  }

  @Put()
  update(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.update(user.companyId, dto);
  }
}
