import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ProfileService } from './profile.service';
import { CreateSavedAddressDto } from './create-saved-address.dto';
import { UpdateSavedAddressDto } from './update-saved-address.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Get('addresses')
  list(@Req() req: Request & { user: { id: string } }) {
    return this.profileService.listAddresses(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Post('addresses')
  create(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateSavedAddressDto,
  ) {
    return this.profileService.createAddress(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Patch('addresses/:id')
  update(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateSavedAddressDto,
  ) {
    return this.profileService.updateAddress(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Delete('addresses/:id')
  remove(@Req() req: Request & { user: { id: string } }, @Param('id') id: string) {
    return this.profileService.deleteAddress(req.user.id, id);
  }
}
