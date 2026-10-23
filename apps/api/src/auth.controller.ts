import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import argon2 from 'argon2';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { identityEmailSchema } from './identity/email.js';
import { DatabaseService } from './database.service.js';

const loginInput = z.strictObject({
  email: identityEmailSchema,
  password: z.string().min(1).max(1024),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly database: DatabaseService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: unknown) {
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Enter a valid email and password');
    }

    const email = parsed.data.email;
    const user = await this.database.master.user.findUnique({
      where: { email },
      include: { gymAccesses: { include: { gym: true } } },
    });

    const passwordMatches =
      user && (await argon2.verify(user.passwordHash, parsed.data.password));

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET is missing or too short');
    }

    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer('gymos-v2')
      .setAudience('gymos-api')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(secret));

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      globalRole: user.globalRole,
      gyms: user.gymAccesses
        .filter((access) => access.gym.status === 'ACTIVE' && access.linkStatus === 'ACTIVE' && access.role === 'OWNER')
        .map((access) => ({
          id: access.gym.id,
          slug: access.gym.slug,
          name: access.gym.name,
          role: access.role,
        })),
    };
  }
}
