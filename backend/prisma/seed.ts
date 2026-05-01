import * as bcrypt from 'bcrypt';
import {
  ModifierGroupType,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '123456';

async function upsertUsers(passwordHash: string) {
  const users = [
    {
      email: 'dispatcher@demo.kz',
      name: 'Demo Dispatcher',
      role: UserRole.DISPATCHER,
      phone: '+77010000001',
    },
    {
      email: 'courier1@demo.kz',
      name: 'Demo Courier 1',
      role: UserRole.COURIER,
      phone: '+77010000002',
    },
    {
      email: 'courier2@demo.kz',
      name: 'Demo Courier 2',
      role: UserRole.COURIER,
      phone: '+77010000003',
    },
    {
      email: 'client@demo.kz',
      name: 'Demo Client',
      role: UserRole.CLIENT,
      phone: '+77010000004',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        phone: user.phone,
        passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        passwordHash,
      },
    });
  }
}

async function upsertRestaurantSettings() {
  await prisma.restaurantSettings.upsert({
    where: { restaurantName: 'Demo Restaurant' },
    update: {
      restaurantLat: 43.238949,
      restaurantLng: 76.889709,
      freeDeliveryRadiusKm: 4,
      longDistanceFeeKzt: 1500,
      minOrderAmount: 5000,
      openMinutes: 540,
      closeMinutes: 1080,
      allowPreorder: true,
    },
    create: {
      restaurantName: 'Demo Restaurant',
      restaurantLat: 43.238949,
      restaurantLng: 76.889709,
      freeDeliveryRadiusKm: 4,
      longDistanceFeeKzt: 1500,
      minOrderAmount: 5000,
      openMinutes: 540,
      closeMinutes: 1080,
      allowPreorder: true,
    },
  });
}

const HEALTH_CATEGORIES = [
  {
    slug: 'gentle_gi',
    title: 'Щадящее для ЖКТ',
    description: 'Мягкие блюда без жарки и острого, нейтральные вкусы, лёгкая текстура.',
  },
  {
    slug: 'gastritis_friendly',
    title: 'Чувствительный желудок / гастрит-френдли',
    description: 'Без кислого, острого и тяжёлых соусов. Тёплая еда, простые составы.',
  },
  {
    slug: 'gerd_friendly',
    title: 'ГЭРБ / изжога-френдли',
    description: 'Без томатов/цитрусов/кофе/шоколада, меньше жирного. Лёгкие порции.',
  },
  {
    slug: 'ibs_low_trigger',
    title: 'СРК: без триггеров (low-FODMAP-лайт)',
    description: 'Без лука/чеснока, минимум бобовых и тяжёлой клетчатки. Простые продукты.',
  },
  {
    slug: 'pancreas_light',
    title: 'Легко для поджелудочной',
    description: 'Низкая жирность, без жареного, аккуратно со специями и клетчаткой.',
  },
  {
    slug: 'low_fat_bile_liver',
    title: 'Жёлчный/печень: low-fat',
    description: 'Запечённое/тушёное, минимум жира, без тяжёлых соусов.',
  },
  {
    slug: 'constipation_gentle_fiber',
    title: 'Запоры: мягкая клетчатка',
    description: 'Больше мягкой клетчатки и тёплых блюд. Без “жёстких” раздражителей.',
  },
  {
    slug: 'recovery_diarrhea',
    title: 'Восстановление после расстройства ЖКТ',
    description: 'Максимально простая еда: рис, нежирный белок, пюре/супы, без молочки.',
  },
  {
    slug: 'lactose_free',
    title: 'Без лактозы',
    description: 'Без молочных продуктов или с безлактозными альтернативами.',
  },
  {
    slug: 'gluten_free',
    title: 'Без глютена',
    description: 'Подборка без глютена. Если кухня общая — пометьте риск перекрёстного контакта.',
  },
];

type MenuItemDef = {
  slug: string;
  name: string;
  description: string;
  ingredients: string;
  allergens: string[];
  dishType: string;
  basePriceKzt: number;
  dietTags: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

const MENU_ITEMS: MenuItemDef[] = [
  {
    slug: 'gentle-oatmeal-banana',
    name: 'Овсяная каша (без сахара) с бананом',
    description: 'Тёплая мягкая каша, без жарки и острых специй.',
    ingredients: 'Овсяные хлопья, вода/безлактозное молоко, банан, корица (опц.)',
    allergens: ['gluten*'],
    dishType: 'breakfast',
    basePriceKzt: 1400,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'constipation_gentle_fiber'],
    calories: 350, protein: 10, carbs: 65, fat: 6,
  },
  {
    slug: 'gentle-chicken-rice-soup',
    name: 'Нежный куриный суп с рисом',
    description: 'Лёгкий бульон, мягкие ингредиенты.',
    ingredients: 'Курица, рис, морковь, зелень (минимум)',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1700,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'recovery_diarrhea', 'low_fat_bile_liver'],
    calories: 180, protein: 15, carbs: 20, fat: 3,
  },
  {
    slug: 'gentle-turkey-steam-cutlet-cauliflower-mash',
    name: 'Паровые котлеты из индейки + пюре из цветной капусты',
    description: 'Без жарки, мягкая текстура.',
    ingredients: 'Индейка, специи минимум, цветная капуста, немного масла (опц.)',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3200,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 360, protein: 32, carbs: 20, fat: 15,
  },
  {
    slug: 'gentle-hake-baked-rice',
    name: 'Запечённый хек + рис',
    description: 'Нежная рыба, без тяжёлых соусов.',
    ingredients: 'Хек, рис, лимон (опц., можно убрать), зелень минимум',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3400,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 380, protein: 28, carbs: 45, fat: 6,
  },
  {
    slug: 'gentle-omelet-steam-zucchini',
    name: 'Омлет на пару с кабачком',
    description: 'Лёгкий белковый завтрак без жарки.',
    ingredients: 'Яйца, кабачок, зелень',
    allergens: ['eggs'],
    dishType: 'breakfast',
    basePriceKzt: 1900,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'gerd_friendly', 'gluten_free', 'lactose_free'],
    calories: 200, protein: 15, carbs: 4, fat: 14,
  },
  {
    slug: 'gentle-baked-apple-cinnamon',
    name: 'Запечённое яблоко с корицей (без сахара)',
    description: 'Мягкий десерт, подходит как перекус.',
    ingredients: 'Яблоко, корица',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1200,
    dietTags: ['gentle_gi', 'gastritis_friendly', 'recovery_diarrhea', 'lactose_free', 'gluten_free'],
    calories: 110, protein: 1, carbs: 26, fat: 1,
  },

  {
    slug: 'gastritis-buckwheat-turkey',
    name: 'Гречка + индейка (тушёная/на пару)',
    description: 'Простой состав, нейтральный вкус.',
    ingredients: 'Гречка, индейка, морковь (опц.)',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3000,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'low_fat_bile_liver', 'pancreas_light', 'gluten_free', 'lactose_free'],
    calories: 440, protein: 35, carbs: 48, fat: 8,
  },
  {
    slug: 'gastritis-zucchini-cream-soup',
    name: 'Крем-суп из кабачка',
    description: 'Пюре-текстура, без острого.',
    ingredients: 'Кабачок, картофель (немного), бульон овощной',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1600,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 120, protein: 3, carbs: 16, fat: 4,
  },
  {
    slug: 'gastritis-cod-steam-veg',
    name: 'Треска на пару + овощи',
    description: 'Нежный белок и мягкие овощи.',
    ingredients: 'Треска, морковь, кабачок, брокколи (опц.)',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3600,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 300, protein: 30, carbs: 15, fat: 5,
  },
  {
    slug: 'gastritis-rice-porridge',
    name: 'Рисовая каша (без сахара)',
    description: 'Максимально мягкая каша.',
    ingredients: 'Рис, вода/безлактозное молоко',
    allergens: [],
    dishType: 'breakfast',
    basePriceKzt: 1300,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'recovery_diarrhea', 'gluten_free', 'lactose_free'],
    calories: 280, protein: 6, carbs: 60, fat: 2,
  },
  {
    slug: 'gastritis-chicken-souffle',
    name: 'Куриное суфле (запечённое)',
    description: 'Очень мягкая белковая текстура.',
    ingredients: 'Курица, яйцо (опц.), специи минимум',
    allergens: ['eggs*'],
    dishType: 'main',
    basePriceKzt: 2800,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 280, protein: 28, carbs: 8, fat: 14,
  },
  {
    slug: 'gastritis-compote-no-sugar',
    name: 'Компот без сахара',
    description: 'Тёплый/холодный напиток без добавленного сахара.',
    ingredients: 'Сухофрукты/яблоко, вода',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 700,
    dietTags: ['gastritis_friendly', 'gentle_gi', 'gerd_friendly', 'ibs_low_trigger', 'pancreas_light', 'low_fat_bile_liver', 'constipation_gentle_fiber', 'recovery_diarrhea', 'lactose_free', 'gluten_free'],
    calories: 45, protein: 0, carbs: 11, fat: 0,
  },

  {
    slug: 'gerd-oatmeal-pear',
    name: 'Овсянка (без сахара) с грушей',
    description: 'Без кислых фруктов, мягкий вкус.',
    ingredients: 'Овсяные хлопья, вода/безлактозное молоко, груша',
    allergens: ['gluten*'],
    dishType: 'breakfast',
    basePriceKzt: 1450,
    dietTags: ['gerd_friendly', 'gentle_gi', 'constipation_gentle_fiber'],
    calories: 330, protein: 9, carbs: 62, fat: 5,
  },
  {
    slug: 'gerd-chicken-no-tomato-stew',
    name: 'Тушёная курица с кабачком (без томатов)',
    description: 'Без кислотных соусов.',
    ingredients: 'Курица, кабачок, морковь, специи минимум',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3100,
    dietTags: ['gerd_friendly', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 340, protein: 30, carbs: 14, fat: 16,
  },
  {
    slug: 'gerd-steam-fish-quinoa',
    name: 'Рыба на пару + киноа',
    description: 'Лёгкий ужин без жарки.',
    ingredients: 'Рыба белая, киноа',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3900,
    dietTags: ['gerd_friendly', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 420, protein: 32, carbs: 44, fat: 8,
  },
  {
    slug: 'gerd-veg-puree-soup',
    name: 'Овощной суп-пюре (без томата и острого)',
    description: 'Лёгкий, нейтральный вкус.',
    ingredients: 'Кабачок, картофель (немного), морковь',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1600,
    dietTags: ['gerd_friendly', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 115, protein: 3, carbs: 18, fat: 3,
  },
  {
    slug: 'gerd-steam-omelet',
    name: 'Омлет на пару (классический)',
    description: 'Без жарки и без острых добавок.',
    ingredients: 'Яйца, вода/безлактозное молоко (опц.)',
    allergens: ['eggs'],
    dishType: 'breakfast',
    basePriceKzt: 1700,
    dietTags: ['gerd_friendly', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 200, protein: 14, carbs: 2, fat: 14,
  },
  {
    slug: 'gerd-herbal-tea',
    name: 'Травяной чай',
    description: 'Ромашка/мята (по наличию). Без кофеина.',
    ingredients: 'Травяной чай',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 600,
    dietTags: ['gerd_friendly', 'gentle_gi', 'ibs_low_trigger', 'pancreas_light', 'low_fat_bile_liver', 'recovery_diarrhea', 'lactose_free', 'gluten_free'],
    calories: 5, protein: 0, carbs: 1, fat: 0,
  },

  {
    slug: 'ibs-rice-chicken-bowl',
    name: 'Боул: рис + курица + огурец (без лука/чеснока)',
    description: 'Простой состав, без частых триггеров СРК.',
    ingredients: 'Рис, курица, огурец, зелень минимум, соус опц.',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3200,
    dietTags: ['ibs_low_trigger', 'recovery_diarrhea', 'lactose_free', 'gluten_free', 'low_fat_bile_liver', 'pancreas_light'],
    calories: 420, protein: 32, carbs: 48, fat: 7,
  },
  {
    slug: 'ibs-turkey-cutlet-rice',
    name: 'Индейка на пару + рис',
    description: 'Без острых специй, без лука/чеснока.',
    ingredients: 'Индейка, рис',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3100,
    dietTags: ['ibs_low_trigger', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 400, protein: 34, carbs: 46, fat: 6,
  },
  {
    slug: 'ibs-zucchini-soup',
    name: 'Суп из кабачка (без сливок, без лука)',
    description: 'Мягкий суп для чувствительного кишечника.',
    ingredients: 'Кабачок, картофель (немного), бульон овощной',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1550,
    dietTags: ['ibs_low_trigger', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 110, protein: 3, carbs: 15, fat: 3,
  },
  {
    slug: 'ibs-omelet-zucchini',
    name: 'Омлет с кабачком (без молока)',
    description: 'Без лактозы, мягко для ЖКТ.',
    ingredients: 'Яйца, кабачок, зелень минимум',
    allergens: ['eggs'],
    dishType: 'breakfast',
    basePriceKzt: 1900,
    dietTags: ['ibs_low_trigger', 'lactose_free', 'gluten_free', 'gerd_friendly', 'gentle_gi'],
    calories: 195, protein: 14, carbs: 5, fat: 13,
  },
  {
    slug: 'ibs-banana-snack',
    name: 'Банан (перекус)',
    description: 'Простой перекус, мягкий для ЖКТ.',
    ingredients: 'Банан',
    allergens: [],
    dishType: 'snack',
    basePriceKzt: 600,
    dietTags: ['ibs_low_trigger', 'recovery_diarrhea', 'gentle_gi', 'lactose_free', 'gluten_free'],
    calories: 90, protein: 1, carbs: 23, fat: 0,
  },
  {
    slug: 'ibs-rice-cakes-turkey-pate',
    name: 'Рисовые хлебцы + паштет из индейки (нежный)',
    description: 'Без острого, без лука/чеснока.',
    ingredients: 'Рисовые хлебцы, индейка, специи минимум',
    allergens: [],
    dishType: 'snack',
    basePriceKzt: 1500,
    dietTags: ['ibs_low_trigger', 'lactose_free', 'gluten_free', 'gentle_gi'],
    calories: 220, protein: 15, carbs: 28, fat: 5,
  },

  {
    slug: 'pancreas-cauliflower-mash-chicken',
    name: 'Курица запечённая + пюре из цветной капусты',
    description: 'Низкая жирность, без жарки.',
    ingredients: 'Курица, цветная капуста, специи минимум',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3200,
    dietTags: ['pancreas_light', 'gentle_gi', 'low_fat_bile_liver', 'lactose_free', 'gluten_free', 'gastritis_friendly'],
    calories: 360, protein: 32, carbs: 20, fat: 15,
  },
  {
    slug: 'pancreas-hake-steam-veg',
    name: 'Хек на пару + овощи на пару',
    description: 'Очень лёгкий белок и гарнир.',
    ingredients: 'Хек, морковь, кабачок',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3700,
    dietTags: ['pancreas_light', 'gentle_gi', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 290, protein: 26, carbs: 14, fat: 6,
  },
  {
    slug: 'pancreas-rice-soup',
    name: 'Суп-лапша рисовая (без жарки)',
    description: 'Лёгкий суп, минимум специй.',
    ingredients: 'Курица, рисовая лапша, морковь',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1750,
    dietTags: ['pancreas_light', 'gentle_gi', 'recovery_diarrhea', 'low_fat_bile_liver', 'lactose_free', 'gluten_free'],
    calories: 200, protein: 15, carbs: 28, fat: 3,
  },
  {
    slug: 'pancreas-buckwheat-omelet',
    name: 'Гречка + омлет на пару',
    description: 'Сытно и щадяще.',
    ingredients: 'Гречка, яйца',
    allergens: ['eggs'],
    dishType: 'main',
    basePriceKzt: 2600,
    dietTags: ['pancreas_light', 'gentle_gi', 'low_fat_bile_liver', 'gluten_free', 'lactose_free', 'gastritis_friendly'],
    calories: 380, protein: 22, carbs: 42, fat: 12,
  },
  {
    slug: 'pancreas-baked-pear',
    name: 'Запечённая груша (без сахара)',
    description: 'Лёгкий десерт, мягкая текстура.',
    ingredients: 'Груша, корица (опц.)',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1200,
    dietTags: ['pancreas_light', 'gentle_gi', 'lactose_free', 'gluten_free', 'gerd_friendly'],
    calories: 100, protein: 1, carbs: 24, fat: 1,
  },
  {
    slug: 'pancreas-rosehip-drink',
    name: 'Напиток шиповника (без сахара)',
    description: 'Тёплый напиток без сахара.',
    ingredients: 'Шиповник, вода',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 700,
    dietTags: ['pancreas_light', 'low_fat_bile_liver', 'gentle_gi', 'lactose_free', 'gluten_free'],
    calories: 30, protein: 0, carbs: 7, fat: 0,
  },

  {
    slug: 'lowfat-turkey-buckwheat',
    name: 'Индейка запечённая + гречка',
    description: 'Low-fat, без тяжёлых соусов.',
    ingredients: 'Индейка, гречка, зелень минимум',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3200,
    dietTags: ['low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 440, protein: 35, carbs: 48, fat: 8,
  },
  {
    slug: 'lowfat-chicken-veg-stew',
    name: 'Курица тушёная с овощами (без жарки)',
    description: 'Нежное тушение, минимум масла.',
    ingredients: 'Курица, кабачок, морковь',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3100,
    dietTags: ['low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'gastritis_friendly', 'gluten_free', 'lactose_free'],
    calories: 340, protein: 30, carbs: 14, fat: 16,
  },
  {
    slug: 'lowfat-veg-cream-soup',
    name: 'Овощной крем-суп (без сливок)',
    description: 'Лёгкий, тёплый суп.',
    ingredients: 'Кабачок, морковь, картофель (немного)',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1600,
    dietTags: ['low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'lactose_free', 'gluten_free'],
    calories: 120, protein: 3, carbs: 18, fat: 3,
  },
  {
    slug: 'lowfat-fish-baked-rice',
    name: 'Запечённая белая рыба + рис',
    description: 'Low-fat, без жарки.',
    ingredients: 'Белая рыба, рис',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3400,
    dietTags: ['low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 380, protein: 28, carbs: 45, fat: 6,
  },
  {
    slug: 'lowfat-salad-warm-veg-turkey',
    name: 'Тёплый салат: запечённые овощи + индейка',
    description: 'Тёплые овощи легче переносятся, минимум масла.',
    ingredients: 'Овощи запечённые, индейка',
    allergens: [],
    dishType: 'salad',
    basePriceKzt: 2900,
    dietTags: ['low_fat_bile_liver', 'gentle_gi', 'pancreas_light', 'lactose_free', 'gluten_free'],
    calories: 320, protein: 28, carbs: 22, fat: 12,
  },
  {
    slug: 'lowfat-steamed-veg-side',
    name: 'Овощи на пару (гарнир)',
    description: 'Лёгкий гарнир.',
    ingredients: 'Морковь, кабачок, брокколи (опц.)',
    allergens: [],
    dishType: 'salad',
    basePriceKzt: 1500,
    dietTags: ['low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'lactose_free', 'gluten_free', 'gastritis_friendly'],
    calories: 90, protein: 3, carbs: 14, fat: 2,
  },

  {
    slug: 'fiber-oatmeal-berries',
    name: 'Овсянка с ягодами (без сахара)',
    description: 'Мягкая клетчатка, тёплая каша.',
    ingredients: 'Овсяные хлопья, вода/безлактозное молоко, ягоды',
    allergens: ['gluten*'],
    dishType: 'breakfast',
    basePriceKzt: 1500,
    dietTags: ['constipation_gentle_fiber', 'gentle_gi', 'lactose_free*'],
    calories: 340, protein: 9, carbs: 62, fat: 6,
  },
  {
    slug: 'fiber-chia-pudding',
    name: 'Чиа-пудинг (без сахара)',
    description: 'Подходит как лёгкий завтрак/перекус.',
    ingredients: 'Семена чиа, растительное/безлактозное молоко, ягоды',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1800,
    dietTags: ['constipation_gentle_fiber', 'lactose_free', 'gluten_free'],
    calories: 240, protein: 8, carbs: 22, fat: 14,
  },
  {
    slug: 'fiber-pumpkin-soup',
    name: 'Суп-пюре из тыквы (без сливок)',
    description: 'Мягкая клетчатка, тёплое блюдо.',
    ingredients: 'Тыква, морковь, бульон овощной',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1650,
    dietTags: ['constipation_gentle_fiber', 'gentle_gi', 'lactose_free', 'gluten_free', 'gastritis_friendly'],
    calories: 130, protein: 3, carbs: 22, fat: 3,
  },
  {
    slug: 'fiber-buckwheat-chicken',
    name: 'Гречка + курица (запечённая)',
    description: 'Сытно и мягко.',
    ingredients: 'Гречка, курица',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 2950,
    dietTags: ['constipation_gentle_fiber', 'low_fat_bile_liver', 'pancreas_light', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 400, protein: 32, carbs: 46, fat: 8,
  },
  {
    slug: 'fiber-prune-compote',
    name: 'Компот из чернослива (без сахара)',
    description: 'Напиток с мягким эффектом клетчатки.',
    ingredients: 'Чернослив, вода',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 750,
    dietTags: ['constipation_gentle_fiber', 'lactose_free', 'gluten_free'],
    calories: 60, protein: 0, carbs: 15, fat: 0,
  },
  {
    slug: 'fiber-warm-veg-bowl',
    name: 'Тёплый боул: овощи тушёные + киноа',
    description: 'Мягкая клетчатка, тёплая подача.',
    ingredients: 'Овощи тушёные, киноа',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3100,
    dietTags: ['constipation_gentle_fiber', 'lactose_free', 'gluten_free', 'gentle_gi'],
    calories: 370, protein: 14, carbs: 54, fat: 9,
  },

  {
    slug: 'recovery-rice-porridge',
    name: 'Рисовая каша на воде',
    description: 'Простая еда для восстановления.',
    ingredients: 'Рис, вода',
    allergens: [],
    dishType: 'breakfast',
    basePriceKzt: 1200,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'gastritis_friendly', 'gluten_free', 'lactose_free'],
    calories: 250, protein: 5, carbs: 55, fat: 1,
  },
  {
    slug: 'recovery-chicken-broth',
    name: 'Куриный бульон (лёгкий)',
    description: 'Тёплый бульон без лишних добавок.',
    ingredients: 'Курица, вода, морковь (опц.)',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1400,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'gastritis_friendly', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 60, protein: 8, carbs: 3, fat: 1,
  },
  {
    slug: 'recovery-chicken-rice',
    name: 'Курица отварная + рис',
    description: 'Максимально простой состав.',
    ingredients: 'Курица, рис',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 2800,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver', 'gluten_free', 'lactose_free'],
    calories: 380, protein: 30, carbs: 42, fat: 7,
  },
  {
    slug: 'recovery-banana',
    name: 'Банан (перекус)',
    description: 'Лёгкий перекус при восстановлении.',
    ingredients: 'Банан',
    allergens: [],
    dishType: 'snack',
    basePriceKzt: 600,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'ibs_low_trigger', 'gluten_free', 'lactose_free'],
    calories: 90, protein: 1, carbs: 23, fat: 0,
  },
  {
    slug: 'recovery-baked-apple',
    name: 'Запечённое яблоко (без сахара)',
    description: 'Мягко и просто.',
    ingredients: 'Яблоко',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1200,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 110, protein: 1, carbs: 26, fat: 1,
  },
  {
    slug: 'recovery-weak-tea',
    name: 'Слабый чай',
    description: 'Тёплый напиток, без сахара.',
    ingredients: 'Чай, вода',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 500,
    dietTags: ['recovery_diarrhea', 'gentle_gi', 'gluten_free', 'lactose_free'],
    calories: 5, protein: 0, carbs: 1, fat: 0,
  },

  {
    slug: 'lf-omelet-water',
    name: 'Омлет (без молока) + зелень',
    description: 'Без лактозы, мягко для ЖКТ.',
    ingredients: 'Яйца, вода, зелень',
    allergens: ['eggs'],
    dishType: 'breakfast',
    basePriceKzt: 1700,
    dietTags: ['lactose_free', 'gentle_gi', 'gerd_friendly', 'ibs_low_trigger', 'gluten_free'],
    calories: 190, protein: 14, carbs: 2, fat: 13,
  },
  {
    slug: 'lf-chicken-quinoa-bowl',
    name: 'Боул: киноа + курица + огурец',
    description: 'Без молочных соусов, без сахара.',
    ingredients: 'Киноа, курица, огурец, зелень минимум',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3600,
    dietTags: ['lactose_free', 'gluten_free', 'low_fat_bile_liver', 'pancreas_light'],
    calories: 420, protein: 32, carbs: 44, fat: 8,
  },
  {
    slug: 'lf-veg-soup',
    name: 'Овощной суп (без сливок)',
    description: 'Лёгкий суп без молочных добавок.',
    ingredients: 'Кабачок, морковь, картофель (немного)',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1500,
    dietTags: ['lactose_free', 'gluten_free', 'gentle_gi', 'gastritis_friendly', 'gerd_friendly', 'pancreas_light'],
    calories: 115, protein: 3, carbs: 17, fat: 3,
  },
  {
    slug: 'lf-fish-rice',
    name: 'Белая рыба + рис (без соуса)',
    description: 'Без молочки, без жарки.',
    ingredients: 'Рыба, рис',
    allergens: ['fish'],
    dishType: 'main',
    basePriceKzt: 3400,
    dietTags: ['lactose_free', 'gluten_free', 'gentle_gi', 'pancreas_light', 'low_fat_bile_liver'],
    calories: 380, protein: 28, carbs: 44, fat: 6,
  },
  {
    slug: 'lf-chia-pudding',
    name: 'Чиа-пудинг на растительном молоке (без сахара)',
    description: 'Десерт без лактозы и без сахара.',
    ingredients: 'Чиа, растительное молоко, ягоды',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1900,
    dietTags: ['lactose_free', 'gluten_free', 'constipation_gentle_fiber'],
    calories: 240, protein: 8, carbs: 22, fat: 14,
  },
  {
    slug: 'lf-mors-no-sugar',
    name: 'Морс без сахара',
    description: 'Ягодный напиток без добавленного сахара.',
    ingredients: 'Ягоды, вода',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 700,
    dietTags: ['lactose_free', 'gluten_free', 'gentle_gi'],
    calories: 40, protein: 0, carbs: 10, fat: 0,
  },

  {
    slug: 'gf-rice-porridge',
    name: 'Рисовая каша (без сахара)',
    description: 'Без глютена, мягко для ЖКТ.',
    ingredients: 'Рис, вода/безлактозное молоко',
    allergens: [],
    dishType: 'breakfast',
    basePriceKzt: 1300,
    dietTags: ['gluten_free', 'gentle_gi', 'gastritis_friendly', 'recovery_diarrhea', 'lactose_free'],
    calories: 280, protein: 6, carbs: 60, fat: 2,
  },
  {
    slug: 'gf-buckwheat-chicken',
    name: 'Гречка + курица (без соусов)',
    description: 'Без глютена, простой состав.',
    ingredients: 'Гречка, курица',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 2900,
    dietTags: ['gluten_free', 'lactose_free', 'gentle_gi', 'low_fat_bile_liver', 'pancreas_light'],
    calories: 400, protein: 32, carbs: 46, fat: 8,
  },
  {
    slug: 'gf-quinoa-turkey',
    name: 'Киноа + индейка + овощи на пару',
    description: 'Без глютена, без жарки.',
    ingredients: 'Киноа, индейка, овощи',
    allergens: [],
    dishType: 'main',
    basePriceKzt: 3900,
    dietTags: ['gluten_free', 'lactose_free', 'gentle_gi', 'low_fat_bile_liver', 'pancreas_light'],
    calories: 420, protein: 34, carbs: 44, fat: 8,
  },
  {
    slug: 'gf-zucchini-cream-soup',
    name: 'Крем-суп из кабачка (без сливок)',
    description: 'Пюре-суп без глютена.',
    ingredients: 'Кабачок, морковь, картофель (немного)',
    allergens: [],
    dishType: 'soup',
    basePriceKzt: 1600,
    dietTags: ['gluten_free', 'lactose_free', 'gentle_gi', 'gastritis_friendly', 'gerd_friendly', 'ibs_low_trigger'],
    calories: 120, protein: 3, carbs: 16, fat: 4,
  },
  {
    slug: 'gf-baked-apple',
    name: 'Запечённое яблоко (без сахара)',
    description: 'Без глютена, лёгкий десерт.',
    ingredients: 'Яблоко, корица (опц.)',
    allergens: [],
    dishType: 'dessert',
    basePriceKzt: 1200,
    dietTags: ['gluten_free', 'lactose_free', 'gentle_gi', 'recovery_diarrhea'],
    calories: 110, protein: 1, carbs: 26, fat: 1,
  },
  {
    slug: 'gf-herbal-tea',
    name: 'Травяной чай',
    description: 'Без сахара.',
    ingredients: 'Травяной чай',
    allergens: [],
    dishType: 'drink',
    basePriceKzt: 600,
    dietTags: ['gluten_free', 'lactose_free', 'gentle_gi', 'gerd_friendly', 'ibs_low_trigger', 'pancreas_light'],
    calories: 5, protein: 0, carbs: 1, fat: 0,
  },
];

const MODIFIER_GROUPS = [
  {
    name: 'Порция',
    type: ModifierGroupType.SINGLE,
    required: true,
    minSelected: 1,
    maxSelected: 1,
    options: [
      { name: 'S', priceDelta: -200 },
      { name: 'M', priceDelta: 0 },
      { name: 'L', priceDelta: 400 },
    ],
  },
  {
    name: 'Убрать ингредиент',
    type: ModifierGroupType.MULTI,
    required: false,
    minSelected: 0,
    maxSelected: 5,
    options: [
      { name: 'Без лука', priceDelta: 0 },
      { name: 'Без чеснока', priceDelta: 0 },
      { name: 'Не острое', priceDelta: 0 },
      { name: 'Без молочного', priceDelta: 0 },
      { name: 'Без соусов с глютеном', priceDelta: 0 },
    ],
  },
  {
    name: 'Гарнир',
    type: ModifierGroupType.SINGLE,
    required: false,
    minSelected: 0,
    maxSelected: 1,
    options: [
      { name: 'Рис', priceDelta: 0 },
      { name: 'Гречка', priceDelta: 0 },
      { name: 'Киноа', priceDelta: 350 },
      { name: 'Овощи на пару', priceDelta: 200 },
      { name: 'Пюре из цветной капусты', priceDelta: 250 },
    ],
  },
  {
    name: 'Соус',
    type: ModifierGroupType.SINGLE,
    required: false,
    minSelected: 0,
    maxSelected: 1,
    options: [
      { name: 'Без соуса', priceDelta: 0 },
      { name: 'Оливковое масло', priceDelta: 150 },
      { name: 'Йогуртовый (без лактозы)', priceDelta: 200 },
    ],
  },
  {
    name: 'Подсластитель',
    type: ModifierGroupType.SINGLE,
    required: false,
    minSelected: 0,
    maxSelected: 1,
    options: [
      { name: 'Без подсластителя', priceDelta: 0 },
      { name: 'Стевия', priceDelta: 0 },
      { name: 'Эритритол', priceDelta: 0 },
    ],
  },
];

const DISH_TYPE_MAP: Record<string, string> = {
  breakfast: 'BREAKFAST',
  soup: 'SOUP',
  main: 'MAIN',
  salad: 'SALAD',
  snack: 'SNACK',
  dessert: 'DESSERT',
  drink: 'DRINK',
};

async function upsertMenu() {
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();

await prisma.menuCategory.createMany({
    skipDuplicates: true,
    data: HEALTH_CATEGORIES.map((category, index) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
      sortOrder: index + 1,
      isActive: true,
    })),
  });

  const categories = await prisma.menuCategory.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug ?? '', c]));

  const createdItems = [] as { id: string; dishType: string }[];

  for (const item of MENU_ITEMS) {
    const categorySlug = item.dietTags[0];
    const category = categoryBySlug.get(categorySlug);
    if (!category) {
      throw new Error(`Category not found for item ${item.slug}`);
    }
    const created = await prisma.menuItem.create({
      data: {
        slug: item.slug,
        title: item.name,
        description: item.description,
        ingredients: item.ingredients,
        allergens: item.allergens,
        dietTags: item.dietTags,
        dishType: DISH_TYPE_MAP[item.dishType] as any,
        price: item.basePriceKzt,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        isActive: true,
        categoryId: category.id,
      },
      select: { id: true, dishType: true },
    });
    createdItems.push(created);
  }

  const groups = [] as { id: string; name: string }[];
  for (const group of MODIFIER_GROUPS) {
    const created = await prisma.modifierGroup.create({
      data: {
        title: group.name,
        type: group.type,
        required: group.required,
        minSelected: group.minSelected,
        maxSelected: group.maxSelected,
        sortOrder: 0,
      },
      select: { id: true, title: true },
    });
    groups.push({ id: created.id, name: created.title });

    for (const option of group.options) {
      await prisma.modifierOption.create({
        data: {
          groupId: created.id,
          title: option.name,
          priceDelta: option.priceDelta,
          sortOrder: 0,
          isActive: true,
        },
      });
    }
  }

  const groupByName = new Map(groups.map((g) => [g.name, g.id]));
  const portionGroupId = groupByName.get('Порция')!;
  const removeGroupId = groupByName.get('Убрать ингредиент')!;
  const garnishGroupId = groupByName.get('Гарнир')!;
  const sauceGroupId = groupByName.get('Соус')!;
  const sweetenerGroupId = groupByName.get('Подсластитель')!;

  const links: { menuItemId: string; modifierGroupId: string }[] = [];

  for (const item of createdItems) {
    links.push({ menuItemId: item.id, modifierGroupId: portionGroupId });
    links.push({ menuItemId: item.id, modifierGroupId: removeGroupId });

    if (item.dishType === 'MAIN' || item.dishType === 'SALAD') {
      links.push({ menuItemId: item.id, modifierGroupId: garnishGroupId });
      links.push({ menuItemId: item.id, modifierGroupId: sauceGroupId });
    }

    if (item.dishType === 'DESSERT' || item.dishType === 'DRINK') {
      links.push({ menuItemId: item.id, modifierGroupId: sweetenerGroupId });
    }
  }

  await prisma.menuItemModifierGroup.createMany({
    data: links,
    skipDuplicates: true,
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await upsertUsers(passwordHash);
  await upsertRestaurantSettings();
  await upsertMenu();

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
