import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService, MealPlanRequest } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('meal-plan')
  generateMealPlan(@Body() dto: MealPlanRequest) {
    return this.ai.generateMealPlan(dto);
  }
}
