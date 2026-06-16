import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('form/:slug')
  getForm(@Param('slug') slug: string) {
    return this.service.getFormConfig(slug);
  }

  @Post('form/:slug/submit')
  submit(@Param('slug') slug: string, @Body() dto: any) {
    return this.service.submitLead(slug, dto);
  }
}
