import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedAddressDto } from './create-saved-address.dto';
import { UpdateSavedAddressDto } from './update-saved-address.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  listAddresses(userId: string) {
    return this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createAddress(userId: string, dto: CreateSavedAddressDto) {
    return this.prisma.savedAddress.create({
      data: {
        userId,
        label: dto.label,
        addressText: dto.addressText,
        lat: dto.lat ?? 0,
        lng: dto.lng ?? 0,
      },
    });
  }

  async updateAddress(userId: string, id: string, dto: UpdateSavedAddressDto) {
    const existing = await this.prisma.savedAddress.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Address not found');
    if (existing.userId !== userId) throw new ForbiddenException('FORBIDDEN');
    return this.prisma.savedAddress.update({
      where: { id },
      data: {
        label: dto.label,
        addressText: dto.addressText,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async deleteAddress(userId: string, id: string) {
    const existing = await this.prisma.savedAddress.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Address not found');
    if (existing.userId !== userId) throw new ForbiddenException('FORBIDDEN');
    return this.prisma.savedAddress.delete({ where: { id } });
  }
}
