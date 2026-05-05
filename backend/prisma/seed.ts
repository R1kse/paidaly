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
    description: 'Больше мягкой клетчатки и тёплых блюд. Без "жёстких" раздражителей.',
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
  description?: string;
  ingredients?: string;
  allergens: string[];
  dishType: string;
  price: number;
  dietTags: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  weight?: number;
};

const MENU_ITEMS: MenuItemDef[] = [
  // ЗАВТРАКИ
  { slug: 'v2-b01', name: 'Гречневая каша + тыквенное пюре', weight: 300, calories: 290, protein: 9, fat: 3, carbs: 56, price: 1400, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-b02', name: 'Гречневая каша на воде + яйцо пашот', weight: 300, calories: 310, protein: 14, fat: 8, carbs: 46, price: 1500, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['eggs'] },
  { slug: 'v2-b03', name: 'Каша из киноа с яблоком (без сахара)', weight: 280, calories: 300, protein: 10, fat: 4, carbs: 54, price: 1700, dishType: 'breakfast', dietTags: ['gentle_gi','constipation_gentle_fiber','gluten_free','lactose_free','ibs_low_trigger'], allergens: [] },
  { slug: 'v2-b04', name: 'Каша кукурузная на воде (без сахара)', weight: 280, calories: 250, protein: 5, fat: 1, carbs: 54, price: 1200, dishType: 'breakfast', dietTags: ['gentle_gi','recovery_diarrhea','ibs_low_trigger','gluten_free','lactose_free','pancreas_light','low_fat_bile_liver'], allergens: [] },
  { slug: 'v2-b05', name: 'Овсяная каша (без сахара) с бананом', weight: 300, calories: 350, protein: 10, fat: 7, carbs: 60, price: 1400, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','constipation_gentle_fiber'], allergens: ['gluten*'] },
  { slug: 'v2-b06', name: 'Овсянка (без сахара) с грушей', weight: 300, calories: 330, protein: 9, fat: 6, carbs: 58, price: 1450, dishType: 'breakfast', dietTags: ['gerd_friendly','gentle_gi','constipation_gentle_fiber'], allergens: ['gluten*'] },
  { slug: 'v2-b07', name: 'Овсянка с ягодами (без сахара)', weight: 300, calories: 340, protein: 10, fat: 7, carbs: 56, price: 1500, dishType: 'breakfast', dietTags: ['constipation_gentle_fiber','gentle_gi','lactose_free'], allergens: ['gluten*'] },
  { slug: 'v2-b08', name: 'Омлет (без молока) + зелень', weight: 200, calories: 190, protein: 14, fat: 13, carbs: 2, price: 1700, dishType: 'breakfast', dietTags: ['lactose_free','gentle_gi','gerd_friendly','ibs_low_trigger','gluten_free'], allergens: ['eggs'] },
  { slug: 'v2-b09', name: 'Омлет на пару (классический)', weight: 200, calories: 200, protein: 14, fat: 14, carbs: 2, price: 1700, dishType: 'breakfast', dietTags: ['gerd_friendly','gentle_gi','gluten_free','lactose_free'], allergens: ['eggs'] },
  { slug: 'v2-b10', name: 'Омлет на пару с кабачком', weight: 250, calories: 200, protein: 13, fat: 12, carbs: 6, price: 1900, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','gluten_free','lactose_free'], allergens: ['eggs'] },
  { slug: 'v2-b11', name: 'Омлет с кабачком (без молока)', weight: 250, calories: 195, protein: 13, fat: 12, carbs: 5, price: 1900, dishType: 'breakfast', dietTags: ['ibs_low_trigger','lactose_free','gluten_free','gerd_friendly','gentle_gi'], allergens: ['eggs'] },
  { slug: 'v2-b12', name: 'Паровой омлет с морковью', weight: 220, calories: 195, protein: 13, fat: 11, carbs: 8, price: 1800, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['eggs'] },
  { slug: 'v2-b13', name: 'Рисовая каша (без сахара)', weight: 280, calories: 280, protein: 5, fat: 1, carbs: 62, price: 1300, dishType: 'breakfast', dietTags: ['gastritis_friendly','gentle_gi','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-b14', name: 'Рисовая каша на воде', weight: 280, calories: 250, protein: 5, fat: 1, carbs: 55, price: 1200, dishType: 'breakfast', dietTags: ['recovery_diarrhea','gentle_gi','gastritis_friendly','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-b15', name: 'Рисовая каша с тыквой и корицей', weight: 300, calories: 260, protein: 5, fat: 1, carbs: 57, price: 1350, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-b16', name: 'Рисовый пудинг с тыквой (без сахара)', weight: 280, calories: 270, protein: 6, fat: 2, carbs: 56, price: 1400, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-b17', name: 'Смузи-боул: банан + овсянка + кефир', weight: 300, calories: 320, protein: 10, fat: 5, carbs: 58, price: 1600, dishType: 'breakfast', dietTags: ['gentle_gi','constipation_gentle_fiber','gastritis_friendly'], allergens: ['gluten*'] },
  { slug: 'v2-b18', name: 'Творог мягкий 2% + банан (без сахара)', weight: 250, calories: 240, protein: 22, fat: 5, carbs: 30, price: 1600, dishType: 'breakfast', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light','low_fat_bile_liver','gluten_free'], allergens: ['milk'] },
  { slug: 'v2-b19', name: 'Яйцо пашот + рисовые хлебцы', weight: 200, calories: 210, protein: 12, fat: 8, carbs: 24, price: 1500, dishType: 'breakfast', dietTags: ['gentle_gi','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['eggs'] },

  // СУПЫ
  { slug: 'v2-s01', name: 'Бульон из индейки с морковью', weight: 350, calories: 70, protein: 9, fat: 2, carbs: 4, price: 1450, dishType: 'soup', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','ibs_low_trigger','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s02', name: 'Крем-суп из кабачка', weight: 300, calories: 120, protein: 3, fat: 4, carbs: 16, price: 1600, dishType: 'soup', dietTags: ['gastritis_friendly','gentle_gi','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s03', name: 'Крем-суп из кабачка (без сливок)', weight: 300, calories: 120, protein: 3, fat: 3, carbs: 17, price: 1600, dishType: 'soup', dietTags: ['gluten_free','lactose_free','gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger'], allergens: [] },
  { slug: 'v2-s04', name: 'Куриный бульон (лёгкий)', weight: 350, calories: 60, protein: 8, fat: 2, carbs: 2, price: 1400, dishType: 'soup', dietTags: ['recovery_diarrhea','gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-s05', name: 'Куриный суп с гречкой', weight: 350, calories: 190, protein: 14, fat: 4, carbs: 24, price: 1750, dishType: 'soup', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-s06', name: 'Нежный куриный суп с рисом', weight: 350, calories: 180, protein: 12, fat: 4, carbs: 24, price: 1700, dishType: 'soup', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-s07', name: 'Овощной крем-суп (без сливок)', weight: 300, calories: 120, protein: 3, fat: 3, carbs: 18, price: 1600, dishType: 'soup', dietTags: ['low_fat_bile_liver','pancreas_light','gentle_gi','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s08', name: 'Овощной суп (без сливок)', weight: 350, calories: 115, protein: 4, fat: 2, carbs: 18, price: 1500, dishType: 'soup', dietTags: ['lactose_free','gluten_free','gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light'], allergens: [] },
  { slug: 'v2-s09', name: 'Овощной суп-пюре (без томата и острого)', weight: 300, calories: 115, protein: 3, fat: 3, carbs: 17, price: 1600, dishType: 'soup', dietTags: ['gerd_friendly','gentle_gi','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s10', name: 'Рисовый суп с индейкой (без лука/чеснока)', weight: 350, calories: 185, protein: 14, fat: 3, carbs: 26, price: 1800, dishType: 'soup', dietTags: ['ibs_low_trigger','gentle_gi','recovery_diarrhea','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s11', name: 'Суп из кабачка (без сливок, без лука)', weight: 300, calories: 110, protein: 3, fat: 2, carbs: 17, price: 1550, dishType: 'soup', dietTags: ['ibs_low_trigger','gentle_gi','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s12', name: 'Суп из цветной капусты (без сливок, без лука)', weight: 300, calories: 100, protein: 4, fat: 2, carbs: 14, price: 1500, dishType: 'soup', dietTags: ['ibs_low_trigger','gentle_gi','gerd_friendly','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s13', name: 'Суп-лапша рисовая (без жарки)', weight: 350, calories: 200, protein: 10, fat: 3, carbs: 32, price: 1750, dishType: 'soup', dietTags: ['pancreas_light','gentle_gi','recovery_diarrhea','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s14', name: 'Суп-пюре из батата (без сливок)', weight: 300, calories: 140, protein: 3, fat: 1, carbs: 30, price: 1650, dishType: 'soup', dietTags: ['gentle_gi','gerd_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s15', name: 'Суп-пюре из брокколи (без сливок)', weight: 300, calories: 110, protein: 5, fat: 2, carbs: 14, price: 1600, dishType: 'soup', dietTags: ['gentle_gi','gastritis_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s16', name: 'Суп-пюре из моркови (без сливок)', weight: 300, calories: 110, protein: 2, fat: 2, carbs: 20, price: 1550, dishType: 'soup', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-s17', name: 'Суп-пюре из тыквы (без сливок)', weight: 300, calories: 130, protein: 3, fat: 2, carbs: 24, price: 1650, dishType: 'soup', dietTags: ['constipation_gentle_fiber','gentle_gi','lactose_free','gluten_free','gastritis_friendly'], allergens: [] },

  // ОСНОВНЫЕ
  { slug: 'v2-m01', name: 'Белая рыба + рис (без соуса)', weight: 350, calories: 380, protein: 28, fat: 6, carbs: 52, price: 3400, dishType: 'main', dietTags: ['lactose_free','gluten_free','gentle_gi','pancreas_light','low_fat_bile_liver'], allergens: ['fish'] },
  { slug: 'v2-m02', name: 'Боул: киноа + курица + огурец', weight: 350, calories: 420, protein: 30, fat: 10, carbs: 50, price: 3600, dishType: 'main', dietTags: ['lactose_free','gluten_free','low_fat_bile_liver','pancreas_light','gentle_gi'], allergens: [] },
  { slug: 'v2-m03', name: 'Боул: рис + курица + огурец (без лука/чеснока)', weight: 350, calories: 420, protein: 28, fat: 8, carbs: 56, price: 3200, dishType: 'main', dietTags: ['ibs_low_trigger','recovery_diarrhea','lactose_free','gluten_free','low_fat_bile_liver','pancreas_light','gentle_gi'], allergens: [] },
  { slug: 'v2-m04', name: 'Гречка + индейка (тушёная/на пару)', weight: 350, calories: 440, protein: 32, fat: 10, carbs: 52, price: 3000, dishType: 'main', dietTags: ['gastritis_friendly','gentle_gi','low_fat_bile_liver','pancreas_light','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m05', name: 'Гречка + курица (без соусов)', weight: 350, calories: 400, protein: 30, fat: 8, carbs: 50, price: 2900, dishType: 'main', dietTags: ['gluten_free','lactose_free','gentle_gi','low_fat_bile_liver','pancreas_light'], allergens: [] },
  { slug: 'v2-m06', name: 'Гречка + курица (запечённая)', weight: 350, calories: 400, protein: 30, fat: 9, carbs: 48, price: 2950, dishType: 'main', dietTags: ['constipation_gentle_fiber','low_fat_bile_liver','pancreas_light','gentle_gi','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m07', name: 'Гречка + омлет на пару', weight: 300, calories: 380, protein: 18, fat: 12, carbs: 48, price: 2600, dishType: 'main', dietTags: ['pancreas_light','gentle_gi','low_fat_bile_liver','gluten_free','lactose_free','gastritis_friendly'], allergens: ['eggs'] },
  { slug: 'v2-m08', name: 'Запечённая белая рыба + рис', weight: 350, calories: 380, protein: 28, fat: 7, carbs: 50, price: 3400, dishType: 'main', dietTags: ['low_fat_bile_liver','pancreas_light','gentle_gi','gluten_free','lactose_free'], allergens: ['fish'] },
  { slug: 'v2-m09', name: 'Запечённый хек + рис', weight: 350, calories: 380, protein: 28, fat: 6, carbs: 52, price: 3400, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['fish'] },
  { slug: 'v2-m10', name: 'Индейка запечённая + гречка', weight: 350, calories: 440, protein: 34, fat: 10, carbs: 50, price: 3200, dishType: 'main', dietTags: ['low_fat_bile_liver','pancreas_light','gentle_gi','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m11', name: 'Индейка на пару + картофельное пюре (без молока)', weight: 350, calories: 400, protein: 28, fat: 8, carbs: 50, price: 3000, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m12', name: 'Индейка на пару + рис', weight: 350, calories: 400, protein: 30, fat: 8, carbs: 52, price: 3100, dishType: 'main', dietTags: ['ibs_low_trigger','gentle_gi','pancreas_light','low_fat_bile_liver','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-m13', name: 'Киноа + индейка + овощи на пару', weight: 350, calories: 420, protein: 32, fat: 10, carbs: 48, price: 3900, dishType: 'main', dietTags: ['gluten_free','lactose_free','gentle_gi','low_fat_bile_liver','pancreas_light'], allergens: [] },
  { slug: 'v2-m14', name: 'Котлеты из индейки на пару + гречка', weight: 350, calories: 410, protein: 30, fat: 10, carbs: 48, price: 3100, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m15', name: 'Кролик тушёный + овощи на пару', weight: 350, calories: 340, protein: 30, fat: 8, carbs: 26, price: 4200, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m16', name: 'Куриная грудка + рис + морковь (на пару)', weight: 350, calories: 390, protein: 30, fat: 6, carbs: 54, price: 2900, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m17', name: 'Куриное суфле (запечённое)', weight: 250, calories: 280, protein: 26, fat: 12, carbs: 14, price: 2800, dishType: 'main', dietTags: ['gastritis_friendly','gentle_gi','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['eggs*'] },
  { slug: 'v2-m18', name: 'Куриные тефтели на пару + рис', weight: 350, calories: 390, protein: 26, fat: 8, carbs: 52, price: 3000, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m19', name: 'Курица запечённая + пюре из цветной капусты', weight: 350, calories: 360, protein: 30, fat: 8, carbs: 34, price: 3200, dishType: 'main', dietTags: ['pancreas_light','gentle_gi','low_fat_bile_liver','lactose_free','gluten_free','gastritis_friendly'], allergens: [] },
  { slug: 'v2-m20', name: 'Курица на пару + пюре из батата', weight: 350, calories: 380, protein: 28, fat: 6, carbs: 50, price: 3200, dishType: 'main', dietTags: ['gentle_gi','gerd_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m21', name: 'Курица отварная + рис', weight: 350, calories: 380, protein: 28, fat: 6, carbs: 54, price: 2800, dishType: 'main', dietTags: ['recovery_diarrhea','gentle_gi','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m22', name: 'Курица тушёная с овощами (без жарки)', weight: 350, calories: 340, protein: 28, fat: 8, carbs: 32, price: 3100, dishType: 'main', dietTags: ['low_fat_bile_liver','pancreas_light','gentle_gi','gastritis_friendly','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m23', name: 'Паровые котлеты из индейки + пюре из цветной капусты', weight: 350, calories: 360, protein: 30, fat: 8, carbs: 32, price: 3200, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m24', name: 'Рис с тушёными овощами (без лука/чеснока)', weight: 350, calories: 340, protein: 8, fat: 4, carbs: 64, price: 2600, dishType: 'main', dietTags: ['gentle_gi','ibs_low_trigger','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m25', name: 'Рыба на пару + киноа', weight: 350, calories: 420, protein: 32, fat: 10, carbs: 46, price: 3900, dishType: 'main', dietTags: ['gerd_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free','gentle_gi'], allergens: ['fish'] },
  { slug: 'v2-m26', name: 'Рыбные котлеты на пару + гречка', weight: 350, calories: 380, protein: 26, fat: 8, carbs: 48, price: 3300, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['fish'] },
  { slug: 'v2-m27', name: 'Судак запечённый + рис', weight: 350, calories: 370, protein: 28, fat: 6, carbs: 50, price: 3800, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['fish'] },
  { slug: 'v2-m28', name: 'Суфле из индейки + картофельное пюре (без молока)', weight: 350, calories: 370, protein: 26, fat: 10, carbs: 42, price: 3200, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m29', name: 'Тефтели из индейки в нежном бульоне + рис', weight: 400, calories: 420, protein: 28, fat: 10, carbs: 52, price: 3300, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m30', name: 'Треска на пару + овощи', weight: 350, calories: 300, protein: 28, fat: 4, carbs: 30, price: 3600, dishType: 'main', dietTags: ['gastritis_friendly','gentle_gi','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['fish'] },
  { slug: 'v2-m31', name: 'Тушёная курица с кабачком (без томатов)', weight: 350, calories: 340, protein: 28, fat: 8, carbs: 30, price: 3100, dishType: 'main', dietTags: ['gerd_friendly','gentle_gi','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-m32', name: 'Тёплый боул: овощи тушёные + киноа', weight: 350, calories: 370, protein: 12, fat: 8, carbs: 58, price: 3100, dishType: 'main', dietTags: ['constipation_gentle_fiber','lactose_free','gluten_free','gentle_gi'], allergens: [] },
  { slug: 'v2-m33', name: 'Филе минтая запечённое + пюре из кабачка', weight: 350, calories: 280, protein: 24, fat: 4, carbs: 30, price: 3500, dishType: 'main', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['fish'] },

  // САЛАТЫ
  { slug: 'v2-sl01', name: 'Винегрет лёгкий (без солёных огурцов)', weight: 250, calories: 140, protein: 3, fat: 2, carbs: 26, price: 1500, dishType: 'salad', dietTags: ['constipation_gentle_fiber','gentle_gi','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sl02', name: 'Овощи на пару (гарнир)', weight: 200, calories: 90, protein: 3, fat: 1, carbs: 16, price: 1500, dishType: 'salad', dietTags: ['low_fat_bile_liver','pancreas_light','gentle_gi','lactose_free','gluten_free','gastritis_friendly'], allergens: [] },
  { slug: 'v2-sl03', name: 'Салат из моркови и яблока (тёртый)', weight: 180, calories: 80, protein: 1, fat: 0, carbs: 18, price: 1100, dishType: 'salad', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','recovery_diarrhea','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sl04', name: 'Салат из огурцов + зелень (без лука)', weight: 180, calories: 40, protein: 1, fat: 0, carbs: 8, price: 1000, dishType: 'salad', dietTags: ['gentle_gi','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sl05', name: 'Салат из отварной свёклы с черносливом', weight: 200, calories: 130, protein: 2, fat: 1, carbs: 28, price: 1400, dishType: 'salad', dietTags: ['constipation_gentle_fiber','gentle_gi','gastritis_friendly','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-sl06', name: 'Салат из отварных овощей (без майонеза)', weight: 220, calories: 100, protein: 3, fat: 1, carbs: 20, price: 1300, dishType: 'salad', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sl07', name: 'Тёплый салат: запечённые овощи + индейка', weight: 300, calories: 320, protein: 24, fat: 10, carbs: 28, price: 2900, dishType: 'salad', dietTags: ['low_fat_bile_liver','gentle_gi','pancreas_light','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-sl08', name: 'Тёплый салат: кабачок + морковь + курица', weight: 280, calories: 260, protein: 22, fat: 6, carbs: 28, price: 2700, dishType: 'salad', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sl09', name: 'Тёплый салат: тыква + киноа + индейка', weight: 300, calories: 340, protein: 24, fat: 8, carbs: 40, price: 3200, dishType: 'salad', dietTags: ['gentle_gi','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },

  // ПЕРЕКУСЫ
  { slug: 'v2-sn01', name: 'Банан (перекус)', weight: 120, calories: 90, protein: 1, fat: 0, carbs: 22, price: 600, dishType: 'snack', dietTags: ['recovery_diarrhea','gentle_gi','ibs_low_trigger','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn02', name: 'Галеты рисовые + банан', weight: 130, calories: 150, protein: 3, fat: 1, carbs: 34, price: 900, dishType: 'snack', dietTags: ['gentle_gi','recovery_diarrhea','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn03', name: 'Запечённая тыква (кубиками)', weight: 150, calories: 80, protein: 2, fat: 0, carbs: 18, price: 800, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn04', name: 'Кабачковые оладьи на пару (без муки)', weight: 150, calories: 120, protein: 5, fat: 4, carbs: 14, price: 1300, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: ['eggs'] },
  { slug: 'v2-sn05', name: 'Морковные палочки + хумус нежный (малая порция)', weight: 130, calories: 140, protein: 5, fat: 5, carbs: 18, price: 1200, dishType: 'snack', dietTags: ['gentle_gi','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn06', name: 'Печёное яблоко (перекус)', weight: 150, calories: 70, protein: 0, fat: 0, carbs: 18, price: 600, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn07', name: 'Рисовые хлебцы + мягкий творог', weight: 150, calories: 180, protein: 12, fat: 4, carbs: 24, price: 1300, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light','low_fat_bile_liver','gluten_free'], allergens: ['milk'] },
  { slug: 'v2-sn08', name: 'Рисовые хлебцы + паштет из индейки (нежный)', weight: 150, calories: 220, protein: 14, fat: 6, carbs: 28, price: 1500, dishType: 'snack', dietTags: ['ibs_low_trigger','lactose_free','gluten_free','gentle_gi'], allergens: [] },
  { slug: 'v2-sn09', name: 'Рисовый крекер + авокадо (тонкий слой)', weight: 120, calories: 160, protein: 3, fat: 8, carbs: 18, price: 1300, dishType: 'snack', dietTags: ['gentle_gi','ibs_low_trigger','gluten_free','lactose_free','constipation_gentle_fiber'], allergens: [] },
  { slug: 'v2-sn10', name: 'Суфле из тыквы (порционное)', weight: 130, calories: 110, protein: 3, fat: 2, carbs: 20, price: 1200, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-sn11', name: 'Творожное суфле (нежное, 2%)', weight: 150, calories: 130, protein: 14, fat: 3, carbs: 12, price: 1400, dishType: 'snack', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','pancreas_light','low_fat_bile_liver','gluten_free'], allergens: ['milk'] },

  // ДЕСЕРТЫ
  { slug: 'v2-d01', name: 'Желе из натурального сока (без сахара)', weight: 150, calories: 60, protein: 1, fat: 0, carbs: 14, price: 900, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d02', name: 'Запечённая груша (без сахара)', weight: 180, calories: 100, protein: 1, fat: 0, carbs: 24, price: 1200, dishType: 'dessert', dietTags: ['pancreas_light','gentle_gi','lactose_free','gluten_free','gerd_friendly'], allergens: [] },
  { slug: 'v2-d03', name: 'Запечённое яблоко (без сахара)', weight: 180, calories: 110, protein: 0, fat: 0, carbs: 28, price: 1200, dishType: 'dessert', dietTags: ['gluten_free','lactose_free','gentle_gi','recovery_diarrhea'], allergens: [] },
  { slug: 'v2-d04', name: 'Запечённое яблоко с корицей (без сахара)', weight: 180, calories: 110, protein: 0, fat: 0, carbs: 28, price: 1200, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-d05', name: 'Запечённый банан с корицей', weight: 150, calories: 110, protein: 1, fat: 0, carbs: 28, price: 1000, dishType: 'dessert', dietTags: ['gentle_gi','recovery_diarrhea','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d06', name: 'Компот яблочный (желированный)', weight: 150, calories: 70, protein: 0, fat: 0, carbs: 18, price: 1000, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d07', name: 'Морковно-тыквенное пюре (десерт)', weight: 180, calories: 90, protein: 2, fat: 0, carbs: 20, price: 1100, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d08', name: 'Мусс из банана (без сахара)', weight: 180, calories: 120, protein: 2, fat: 1, carbs: 28, price: 1100, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d09', name: 'Рисовый пудинг с корицей (без сахара)', weight: 200, calories: 180, protein: 4, fat: 2, carbs: 36, price: 1400, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d10', name: 'Тыквенное суфле (без сахара)', weight: 180, calories: 100, protein: 3, fat: 2, carbs: 18, price: 1300, dishType: 'dessert', dietTags: ['gentle_gi','gastritis_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-d11', name: 'Чиа-пудинг (без сахара)', weight: 200, calories: 240, protein: 8, fat: 12, carbs: 24, price: 1800, dishType: 'dessert', dietTags: ['constipation_gentle_fiber','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-d12', name: 'Чиа-пудинг на растительном молоке (без сахара)', weight: 200, calories: 240, protein: 8, fat: 12, carbs: 24, price: 1900, dishType: 'dessert', dietTags: ['lactose_free','gluten_free','constipation_gentle_fiber'], allergens: [] },

  // НАПИТКИ
  { slug: 'v2-dr01', name: 'Кисель овсяный (без сахара)', weight: 250, calories: 80, protein: 2, fat: 1, carbs: 16, price: 800, dishType: 'drink', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','recovery_diarrhea','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber'], allergens: ['gluten*'] },
  { slug: 'v2-dr02', name: 'Компот без сахара', weight: 300, calories: 45, protein: 0, fat: 0, carbs: 11, price: 700, dishType: 'drink', dietTags: ['gastritis_friendly','gentle_gi','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber','recovery_diarrhea','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-dr03', name: 'Компот из чернослива (без сахара)', weight: 300, calories: 60, protein: 0, fat: 0, carbs: 15, price: 750, dishType: 'drink', dietTags: ['constipation_gentle_fiber','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-dr04', name: 'Компот из яблок (без сахара)', weight: 300, calories: 40, protein: 0, fat: 0, carbs: 10, price: 700, dishType: 'drink', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-dr05', name: 'Морс без сахара', weight: 300, calories: 40, protein: 0, fat: 0, carbs: 10, price: 700, dishType: 'drink', dietTags: ['lactose_free','gluten_free','gentle_gi'], allergens: [] },
  { slug: 'v2-dr06', name: 'Напиток из сушёных груш (без сахара)', weight: 300, calories: 35, protein: 0, fat: 0, carbs: 9, price: 700, dishType: 'drink', dietTags: ['gentle_gi','gerd_friendly','pancreas_light','low_fat_bile_liver','constipation_gentle_fiber','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-dr07', name: 'Напиток шиповника (без сахара)', weight: 300, calories: 30, protein: 0, fat: 0, carbs: 7, price: 700, dishType: 'drink', dietTags: ['pancreas_light','low_fat_bile_liver','gentle_gi','lactose_free','gluten_free'], allergens: [] },
  { slug: 'v2-dr08', name: 'Отвар ромашки', weight: 250, calories: 3, protein: 0, fat: 0, carbs: 1, price: 550, dishType: 'drink', dietTags: ['gentle_gi','gastritis_friendly','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-dr09', name: 'Рисовый отвар', weight: 250, calories: 30, protein: 1, fat: 0, carbs: 7, price: 500, dishType: 'drink', dietTags: ['gentle_gi','gastritis_friendly','recovery_diarrhea','ibs_low_trigger','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-dr10', name: 'Слабый чай', weight: 250, calories: 5, protein: 0, fat: 0, carbs: 1, price: 500, dishType: 'drink', dietTags: ['recovery_diarrhea','gentle_gi','gluten_free','lactose_free'], allergens: [] },
  { slug: 'v2-dr11', name: 'Травяной чай', weight: 250, calories: 5, protein: 0, fat: 0, carbs: 1, price: 600, dishType: 'drink', dietTags: ['gluten_free','lactose_free','gentle_gi','gerd_friendly','ibs_low_trigger','pancreas_light','low_fat_bile_liver','recovery_diarrhea'], allergens: [] },
  { slug: 'v2-dr12', name: 'Тыквенный смузи (без сахара)', weight: 250, calories: 60, protein: 1, fat: 0, carbs: 14, price: 900, dishType: 'drink', dietTags: ['gentle_gi','gastritis_friendly','constipation_gentle_fiber','pancreas_light','low_fat_bile_liver','gluten_free','lactose_free'], allergens: [] },
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
  await prisma.menuItem.updateMany({ where: {}, data: { isActive: false } });

  for (const [index, category] of HEALTH_CATEGORIES.entries()) {
    await prisma.menuCategory.upsert({
      where: { slug: category.slug },
      update: { title: category.title, description: category.description, sortOrder: index + 1 },
      create: {
        slug: category.slug,
        title: category.title,
        description: category.description,
        sortOrder: index + 1,
        isActive: true,
      },
    });
  }

  const categories = await prisma.menuCategory.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug ?? '', c]));

  const upsertedItems = [] as { id: string; dishType: string }[];

  for (const item of MENU_ITEMS) {
    const categorySlug = item.dietTags[0];
    const category = categoryBySlug.get(categorySlug);
    if (!category) {
      throw new Error(`Category not found for item ${item.slug}`);
    }
    const itemData = {
      title: item.name,
      description: item.description,
      ingredients: item.ingredients,
      allergens: item.allergens,
      dietTags: item.dietTags,
      dishType: DISH_TYPE_MAP[item.dishType] as any,
      price: item.price,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      weight: item.weight,
      isActive: true,
      categoryId: category.id,
    };
    const upserted = await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: itemData,
      create: { slug: item.slug, ...itemData },
      select: { id: true, dishType: true },
    });
    upsertedItems.push(upserted);
  }

  const groups = [] as { id: string; name: string }[];
  for (const group of MODIFIER_GROUPS) {
    const upserted = await prisma.modifierGroup.upsert({
      where: { title: group.name },
      update: { type: group.type, required: group.required, minSelected: group.minSelected, maxSelected: group.maxSelected },
      create: {
        title: group.name,
        type: group.type,
        required: group.required,
        minSelected: group.minSelected,
        maxSelected: group.maxSelected,
        sortOrder: 0,
      },
      select: { id: true, title: true },
    });
    groups.push({ id: upserted.id, name: upserted.title });

    for (const option of group.options) {
      await prisma.modifierOption.upsert({
        where: { groupId_title: { groupId: upserted.id, title: option.name } },
        update: { priceDelta: option.priceDelta },
        create: { groupId: upserted.id, title: option.name, priceDelta: option.priceDelta, sortOrder: 0, isActive: true },
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

  for (const item of upsertedItems) {
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
