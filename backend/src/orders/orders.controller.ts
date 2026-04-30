import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

interface AuthRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
  };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyOrders(@Req() req: AuthRequest) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get()
  getOrders(@Query('status') status?: OrderStatus) {
    return this.ordersService.getOrders(status);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, req.user.id, req.user.role, dto);
  }
}
