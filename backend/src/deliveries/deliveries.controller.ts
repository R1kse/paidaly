import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeliveriesService } from './deliveries.service';

type AuthRequest = Request & {
  user: {
    id: string;
    role: UserRole;
  };
};

@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('dispatcher/orders/:orderId/assign')
  assignCourier(
    @Param('orderId') orderId: string,
    @Body() body: { courierId: string },
    @Req() req: AuthRequest,
  ) {
    return this.deliveriesService.assignCourier(orderId, body.courierId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Delete('dispatcher/orders/:orderId/assign')
  unassignCourier(@Param('orderId') orderId: string, @Req() req: AuthRequest) {
    return this.deliveriesService.unassignCourier(orderId, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get('dispatcher/couriers')
  getCouriers() {
    return this.deliveriesService.getCouriersWithLastLocation();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get('couriers/:id/last-location')
  getLastLocation(@Param('id') id: string) {
    return this.deliveriesService.getLastLocation(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  @Get('courier/deliveries/active')
  getActiveDeliveries(@Req() req: AuthRequest) {
    return this.deliveriesService.getCourierActiveDeliveries(req.user.id);
  }
}
