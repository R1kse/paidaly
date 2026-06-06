import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

// сервис для авторизации
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  // проверяем пользователя по email и паролю
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (passwordOk === false) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(dto: any) {
    const user = await this.validateUser(dto.email, dto.password);
    const token = await this.makeToken(user);
    return token;
  }

  async register(dto: any) {
    const newUser = await this.usersService.createClient(dto);
    const result = await this.makeToken(newUser);
    return result;
  }

  async googleLogin(googleUser: any) {
    const result = await this.makeToken(googleUser);
    return result;
  }

  async updateProfile(userId: string, dto: any) {
    const updated = await this.usersService.updateProfile(userId, dto);
    const data = {
      id: updated.id,
      role: updated.role,
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? null,
    };
    return data;
  }

  // генерируем jwt токен для пользователя
  private async makeToken(user: any) {
    const payload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken: accessToken,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
      },
    };
  }
}
