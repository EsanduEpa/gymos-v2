import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
// A support context is valid only on its explicit read projection or exit route.
// It is never a general tenant/admin/auth capability.
@Injectable()
export class SupportScopeGuard implements CanActivate {
 canActivate(context:ExecutionContext){
  const request=context.switchToHttp().getRequest<Request>();
  if(!request.headers['x-gymos-support-context'])return true;
  if((['GET','HEAD'].includes(request.method)&&/^\/admin\/support-sessions\/[^/]+\/gyms\/[^/]+\/summary\/?$/.test(request.path))
   ||(request.method==='DELETE'&&/^\/admin\/support-sessions\/[^/]+\/?$/.test(request.path)))return true;
  throw new ForbiddenException('Support is limited to approved read-only summaries and explicit exit');
 }
}
