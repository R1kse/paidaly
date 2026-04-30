import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from '../users/users.service';

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    role: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.issueToken(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.createClient(dto);
    return this.issueToken(user);
  }

  async googleLogin(googleUser: {
    id: string;
    role: string;
    name: string;
    email: string;
    phone?: string | null;
  }): Promise<AuthResponse> {
    return this.issueToken(googleUser);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(userId, dto);
    return {
      id: updated.id,
      role: updated.role,
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? null,
    };
  }

  private async issueToken(user: {
    id: string;
    role: string;
    name: string;
    email: string;
    phone?: string | null;
  }): Promise<AuthResponse> {
    const payload = { sub: user.id, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
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
