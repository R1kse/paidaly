import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/admin/create-category.dto';
import { UpdateCategoryDto } from './dto/admin/update-category.dto';
import { CreateItemDto } from './dto/admin/create-item.dto';
import { UpdateItemDto } from './dto/admin/update-item.dto';
import { CreateModifierGroupDto } from './dto/admin/create-modifier-group.dto';
import { UpdateModifierGroupDto } from './dto/admin/update-modifier-group.dto';
import { CreateModifierOptionDto } from './dto/admin/create-modifier-option.dto';
import { UpdateModifierOptionDto } from './dto/admin/update-modifier-option.dto';
import { SetItemModifierGroupsDto } from './dto/admin/set-item-modifier-groups.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicMenu() {
    const categories = await this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        sortOrder: true,
      },
    });

    const items = await this.prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        slug: true,
        categoryId: true,
        title: true,
        description: true,
        ingredients: true,
        allergens: true,
        dietTags: true,
        dishType: true,
        price: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        isActive: true,
        modifierGroups: {
          select: {
            modifierGroup: {
              select: {
                id: true,
                title: true,
                type: true,
                required: true,
                minSelected: true,
                maxSelected: true,
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    priceDelta: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      categories,
      items: items.map((item) => ({
        ...item,
        modifierGroups: item.modifierGroups.map((group) => ({
          ...group.modifierGroup,
        })),
      })),
    };
  }

  getAdminCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.menuCategory.create({
      data: {
        title: dto.title,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        title: dto.title,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.menuCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  getAdminItems(categoryId?: string) {
    return this.prisma.menuItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { title: 'asc' },
    });
  }

  async createItem(dto: CreateItemDto) {
    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive,
      },
    });
  }

  async deleteItem(id: string) {
    return this.prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createModifierGroup(dto: CreateModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        title: dto.title,
        type: dto.type,
        required: dto.required ?? false,
        minSelected: dto.minSelected ?? 0,
        maxSelected: dto.maxSelected ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateModifierGroup(id: string, dto: UpdateModifierGroupDto) {
    return this.prisma.modifierGroup.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        required: dto.required,
        minSelected: dto.minSelected,
        maxSelected: dto.maxSelected,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async createModifierOption(groupId: string, dto: CreateModifierOptionDto) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Modifier group not found');
    }

    return this.prisma.modifierOption.create({
      data: {
        groupId,
        title: dto.title,
        priceDelta: dto.priceDelta ?? 0,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateModifierOption(id: string, dto: UpdateModifierOptionDto) {
    return this.prisma.modifierOption.update({
      where: { id },
      data: {
        title: dto.title,
        priceDelta: dto.priceDelta,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async setItemModifierGroups(itemId: string, dto: SetItemModifierGroupsDto) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const groups = await this.prisma.modifierGroup.findMany({
      where: { id: { in: dto.modifierGroupIds } },
      select: { id: true },
    });

    if (groups.length !== dto.modifierGroupIds.length) {
      throw new BadRequestException('Invalid modifier groups');
    }

    await this.prisma.$transaction([
      this.prisma.menuItemModifierGroup.deleteMany({
        where: { menuItemId: itemId },
      }),
      this.prisma.menuItemModifierGroup.createMany({
        data: dto.modifierGroupIds.map((groupId) => ({
          menuItemId: itemId,
          modifierGroupId: groupId,
        })),
      }),
    ]);

    return { ok: true };
  }
}