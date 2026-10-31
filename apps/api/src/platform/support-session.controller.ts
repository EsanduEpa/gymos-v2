import { Body, Controller, Delete, Get, Headers, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { supportEntrySchema } from '@gymos/contracts/platform';
import { SuperAdminGuard, type PlatformRequest } from '../super-admin.guard.js';
import { SupportSessionService } from './support-session.service.js';
@Controller('admin/support-sessions')
@UseGuards(SuperAdminGuard)
export class SupportSessionController {
 constructor(private readonly support:SupportSessionService){}
 @Post()
 enter(@Req() request:PlatformRequest,@Body() body:unknown){
  const input=supportEntrySchema.safeParse(body);if(!input.success)throw new UnprocessableEntityException('Choose a gym and scope, and give a support reason of 10–500 characters');
  const actor=request.platformIdentity!;return this.support.enter(actor.identityId,actor.authVersion,input.data);
 }
 @Get(':id/gyms/:slug/summary')
 summary(@Req() request:PlatformRequest,@Param('id') id:string,@Param('slug') slug:string,@Headers('x-gymos-support-context') context:string){const actor=request.platformIdentity!;return this.support.summary(actor.identityId,actor.authVersion,id,context??'',slug);}
 @Delete(':id')
 exit(@Req() request:PlatformRequest,@Param('id') id:string,@Headers('x-gymos-support-context') context:string){const actor=request.platformIdentity!;return this.support.exit(actor.identityId,actor.authVersion,id,context??'');}
}
