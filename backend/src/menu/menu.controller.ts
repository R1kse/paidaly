import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/admin/create-category.dto';
import { UpdateCategoryDto } from './dto/admin/update-category.dto';
import { CreateItemDto } from './dto/admin/create-item.dto';
import { UpdateItemDto } from './dto/admin/update-item.dto';
import { CreateModifierGroupDto } from './dto/admin/create-modifier-group.dto';
import { UpdateModifierGroupDto } from './dto/admin/update-modifier-group.dto';
import { CreateModifierOptionDto } from './dto/admin/create-modifier-option.dto';
import { UpdateModifierOptionDto } from './dto/admin/update-modifier-option.dto';
import { SetItemModifierGroupsDto } from './dto/admin/set-item-modifier-groups.dto';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('menu')
  getMenu() {
    return this.menuService.getPublicMenu();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get('admin/menu/categories')
  getAdminCategories() {
    return this.menuService.getAdminCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('admin/menu/categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Patch('admin/menu/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.menuService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Delete('admin/menu/categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Get('admin/menu/items')
  getAdminItems(@Query('categoryId') categoryId?: string) {
    return this.menuService.getAdminItems(categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('admin/menu/items')
  createItem(@Body() dto: CreateItemDto) {
    return this.menuService.createItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Patch('admin/menu/items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.menuService.updateItem(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Delete('admin/menu/items/:id')
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('admin/menu/modifier-groups')
  createModifierGroup(@Body() dto: CreateModifierGroupDto) {
    return this.menuService.createModifierGroup(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Patch('admin/menu/modifier-groups/:id')
  updateModifierGroup(@Param('id') id: string, @Body() dto: UpdateModifierGroupDto) {
    return this.menuService.updateModifierGroup(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('admin/menu/modifier-groups/:id/options')
  createModifierOption(
    @Param('id') id: string,
    @Body() dto: CreateModifierOptionDto,
  ) {
    return this.menuService.createModifierOption(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Patch('admin/menu/modifier-options/:id')
  updateModifierOption(
    @Param('id') id: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.menuService.updateModifierOption(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DISPATCHER)
  @Post('admin/menu/items/:id/modifier-groups')
  setItemModifierGroups(
    @Param('id') id: string,
    @Body() dto: SetItemModifierGroupsDto,
  ) {
    return this.menuService.setItemModifierGroups(id, dto);
  }
}
