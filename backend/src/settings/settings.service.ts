import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurantSettings() {
    const settings = await this.prisma.restaurantSettings.findFirst({
      select: {
        restaurantName: true,
        restaurantLat: true,
        restaurantLng: true,
        freeDeliveryRadiusKm: true,
        longDistanceFeeKzt: true,
        minOrderAmount: true,
        openMinutes: true,
        closeMinutes: true,
        allowPreorder: true,
      },
    });

    if (!settings) {
      throw new NotFoundException('Restaurant settings not found');
    }

    return settings;
  }
}
