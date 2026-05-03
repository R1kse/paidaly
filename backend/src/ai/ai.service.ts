import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
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
  private client: Groq;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.GROQ_API_KEY) {
      console.warn('[AiService] GROQ_API_KEY is not set — AI endpoints will fail');
    }
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  private async getMenuText() {
    const items = await this.prisma.menuItem.findMany({
      where: { isActive: true },
      select: { id: true, title: true, price: true, calories: true, protein: true, carbs: true, fat: true, dietTags: true, allergens: true, dishType: true },
    });
    return items
      .map((i) => `ID:${i.id} | ${i.title} | ${i.dishType} | ${i.calories ?? '?'} ккал | Б:${i.protein ?? '?'}г Ж:${i.fat ?? '?'}г У:${i.carbs ?? '?'}г | ${i.price}₸ | теги:${i.dietTags.join(',')} | аллергены:${i.allergens.join(',') || 'нет'}`)
      .join('\n');
  }

  async generateMealPlan(req: MealPlanRequest) {
    const menuText = await this.getMenuText();

    const goalLabels: Record<MealGoal, string> = {
      gentle_gi:   'щадящее питание для ЖКТ (гастрит, СРК)',
      weight_loss: 'снижение веса (дефицит калорий)',
      high_protein:'высокобелковое питание',
      low_fat:     'низкожировое питание (желчный пузырь, печень)',
      recovery:    'восстановление после расстройства ЖКТ',
    };

    const days = req.daysCount ?? 3;
    const calTarget = req.calorieTarget ?? 1800;
    const excludeText = req.excludeAllergens?.length
      ? `Исключить аллергены: ${req.excludeAllergens.join(', ')}.`
      : '';

    const prompt = `Ты нутрициолог. Составь рацион питания на ${days} дня для цели: ${goalLabels[req.goal]}.
Целевые калории в день: ~${calTarget} ккал. ${excludeText}

Доступные блюда из меню ресторана (используй ТОЛЬКО их, бери ID точно из списка):
${menuText}

Ответь СТРОГО в формате JSON без markdown, без пояснений:
{
  "days": [
    {
      "day": 1,
      "totalCalories": 1800,
      "meals": [
        {
          "type": "breakfast",
          "typeLabel": "Завтрак",
          "items": [{ "id": "...", "title": "...", "calories": 350, "price": 1400 }],
          "totalCalories": 350
        }
      ]
    }
  ],
  "tips": ["совет 1", "совет 2", "совет 3"]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.choices[0].message.content?.trim() ?? '{}';
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      const json = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;
      return JSON.parse(json);
    } catch (err: any) {
      console.error('[AiService] generateMealPlan error:', err?.message ?? err);
      throw new InternalServerErrorException(err?.message ?? 'Groq API error');
    }
  }

  async chat(history: { role: 'user' | 'assistant'; content: string }[]) {
    if (!process.env.GROQ_API_KEY) {
      throw new InternalServerErrorException('GROQ_API_KEY is not configured');
    }

    const menuText = await this.getMenuText();

    const system = `Ты — дружелюбный AI-ассистент ресторана здорового питания Paidaly.
Специализация: щадящее питание для людей с проблемами ЖКТ (гастрит, СРК, ГЭРБ, панкреатит и др.).
Отвечай кратко, по-русски, дружелюбно. Можешь рекомендовать блюда из меню по запросу.
Не придумывай блюда которых нет в меню. По вопросам здоровья давай общие советы и рекомендуй врача.

Меню ресторана:
${menuText}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          ...history.slice(-10),
        ],
      });

      return { reply: response.choices[0].message.content ?? '' };
    } catch (err: any) {
      console.error('[AiService] chat error:', err?.message ?? err);
      throw new InternalServerErrorException(err?.message ?? 'Groq API error');
    }
  }
}
