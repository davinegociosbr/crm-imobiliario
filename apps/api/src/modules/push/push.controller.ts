import { Controller, Post, Delete, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PushService } from './push.service';

@ApiTags('Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() body: any) {
    return this.pushService.saveSubscription(user.id, body);
  }

  @Delete('unsubscribe')
  unsubscribe(@CurrentUser() user: any, @Body() body: { endpoint: string }) {
    return this.pushService.removeSubscription(user.id, body.endpoint);
  }
}
