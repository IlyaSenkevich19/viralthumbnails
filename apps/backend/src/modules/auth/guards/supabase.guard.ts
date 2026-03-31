import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    let client;
    try {
      client = this.supabase.getAnonClient();
    } catch {
      throw new InternalServerErrorException('Auth is not configured');
    }

    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.userId = user.id;
    return true;
  }
}
