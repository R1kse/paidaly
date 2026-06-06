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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // создание заказа - только для клиентов
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  // получаем заказы текущего пользователя
  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyOrders(@Req() req: any) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  // список всех заказов - только для диспетчеров
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get()
  getOrders(@Query('status') status?: OrderStatus) {
    return this.ordersService.getOrders(status);
  }

  // получаем конкретный заказ по id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.role);
  }

  // оставить отзыв на заказ - только клиенты
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @Post(':id/review')
  createReview(
    @Req() req: any,
    @Param('id') id: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    return this.ordersService.createReview(id, req.user.id, rating, comment);
  }

  // обновить статус заказа
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, req.user.id, req.user.role, dto);
  }
}
