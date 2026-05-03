import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

export type MealGoal = 'gentle_gi' | 'weight_loss' | 'high_protein' | 'low_fat' | 'recovery';

export interface MealPlanRequest {
  goal: MealGoal;
  calorieTarget?: number;
  excludeAllergens?: string[];
  daysCount?: number;
}

@Injectable()
export class AiService {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(private readonly prisma: PrismaService) {}

  async generateMealPlan(req: MealPlanRequest) {
    const items = await this.prisma.menuItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        price: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        dietTags: true,
        allergens: true,
        dishType: true,
        description: true,
      },
    });

    const menuText = items
      .map(
        (i) =>
          `ID:${i.id} | ${i.title} | ${i.dishType} | ${i.calories ?? '?'} ккал | Б:${i.protein ?? '?'}г Ж:${i.fat ?? '?'}г У:${i.carbs ?? '?'}г | ${i.price}₸ | теги:${i.dietTags.join(',')} | аллергены:${i.allergens.join(',') || 'нет'}`,
      )
      .join('\n');

    const goalLabels: Record<MealGoal, string> = {
      gentle_gi: 'щадящее питание для ЖКТ (гастрит, СРК)',
      weight_loss: 'снижение веса (дефицит калорий)',
      high_protein: 'высокобелковое питание',
      low_fat: 'низкожировое питание (желчный пузырь, печень)',
      recovery: 'восстановление после расстройства ЖКТ',
    };

    const days = req.daysCount ?? 3;
    const calTarget = req.calorieTarget ?? 1800;
    const excludeText =
      req.excludeAllergens?.length
        ? `Исключить аллергены: ${req.excludeAllergens.join(', ')}.`
        : '';

    const prompt = `Ты нутрициолог. Составь рацион питания на ${days} дня для цели: ${goalLabels[req.goal]}.
Целевые калории в день: ~${calTarget} ккал. ${excludeText}

Доступные блюда из меню ресторана (используй ТОЛЬКО их):
${menuText}

Ответь СТРОГО в формате JSON без markdown:
{
  "days": [
    {
      "day": 1,
      "totalCalories": 1800,
      "meals": [
        {
          "type": "breakfast|lunch|dinner|snack",
          "typeLabel": "Завтрак",
          "items": [
            { "id": "...", "title": "...", "calories": 350, "price": 1400 }
          ],
          "totalCalories": 350
        }
      ]
    }
  ],
  "tips": ["совет 1", "совет 2", "совет 3"]
}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { text: string }).text.trim();
    const json = raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'));
    return JSON.parse(json);
  }
}
