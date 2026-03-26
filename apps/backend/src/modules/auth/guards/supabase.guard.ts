import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseGuard implements CanActivate {
  private supabase: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  private getSupabaseAuthClient(): SupabaseClient {
    if (!this.supabase) {
      const url = this.config.get<string>('SUPABASE_URL')?.trim();
      const key = this.config.get<string>('SUPABASE_ANON_KEY')?.trim();
      if (!url || !key) {
        throw new InternalServerErrorException('Auth is not configured');
      }
      this.supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.supabase;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    const {
      data: { user },
      error,
    } = await this.getSupabaseAuthClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.userId = user.id;
    return true;
  }
}
