import { Controller, Get, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Post('admin/seed')
  async runSeed(@Headers('x-admin-key') key: string) {
    const secret = process.env.ADMIN_SEED_SECRET;
    if (!secret || key !== secret) throw new UnauthorizedException();

    const tsx = path.resolve('node_modules/.bin/tsx');
    const seedFile = path.resolve('prisma/seed.ts');

    const { stdout, stderr } = await execFileAsync(tsx, [seedFile], { timeout: 120_000 });
    return { ok: true, stdout, stderr };
  }
}
