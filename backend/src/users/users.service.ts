import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createClient(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: UserRole.CLIENT,
        passwordHash,
      },
    });
  }

  async findOrCreateGoogleUser(input: {
    googleId: string;
    email: string;
    name: string;
  }) {
    // Try by googleId first
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: input.googleId },
    });
    if (byGoogleId) return byGoogleId;

    // Try by email — link Google to existing account
    const byEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: input.googleId },
      });
    }

    // New user via Google
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: UserRole.CLIENT,
        googleId: input.googleId,
      },
    });
  }

  async updateProfile(userId: string, input: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name  !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone }),
      },
    });
  }

  listPublicUsers(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<PublicUser[]>;
  }
}
