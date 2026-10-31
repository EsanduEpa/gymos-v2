import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { gymLifecycleInputSchema, idempotencyKeySchema } from '@gymos/contracts/platform';
import { z } from 'zod';
import { SuperAdminGuard, type PlatformRequest } from '../super-admin.guard.js';
import { GymLifecycleService } from './gym-lifecycle.service.js';
@Controller('admin')
@UseGuards(SuperAdminGuard)
export class GymLifecycleController {
 constructor(private readonly lifecycle:GymLifecycleService){}
 @Post('gyms/:id/lifecycle')
 @HttpCode(200)
 execute(@Req() request:PlatformRequest,@Param('id') id:string,@Headers('idempotency-key') key:unknown,@Body() body:unknown){
  const input=gymLifecycleInputSchema.safeParse(body);const parsedKey=idempotencyKeySchema.safeParse(key);
  if(!input.success||!parsedKey.success)throw new UnprocessableEntityException('Provide a current version, status, reason and stable request key');
  const actor=request.platformIdentity!;return this.lifecycle.execute(actor.identityId,actor.authVersion,parsedKey.data,id,input.data);
 }
 @Get('lifecycle/:id')
 status(@Req() request:PlatformRequest,@Param('id') id:string){return this.lifecycle.status(request.platformIdentity!.identityId,id);}
 @Post('lifecycle/:id/resume')
 @HttpCode(200)
 resume(@Req() request:PlatformRequest,@Param('id') id:string,@Body() body:unknown){
  if(!z.strictObject({}).safeParse(body).success)throw new UnprocessableEntityException('Resume uses the original immutable intent');
  const actor=request.platformIdentity!;return this.lifecycle.resume(actor.identityId,actor.authVersion,id);
 }
}
