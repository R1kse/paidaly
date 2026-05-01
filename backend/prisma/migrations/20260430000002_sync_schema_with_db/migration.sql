-- Create missing DishType enum
DO $$ BEGIN
  CREATE TYPE "DishType" AS ENUM ('BREAKFAST', 'SOUP', 'MAIN', 'SALAD', 'SNACK', 'DESSERT', 'DRINK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MenuCategory: add slug and description
ALTER TABLE "MenuCategory" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "MenuCategory" ADD COLUMN IF NOT EXISTS "description" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "MenuCategory_slug_key" ON "MenuCategory"("slug");

-- MenuItem: add slug
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "MenuItem_slug_key" ON "MenuItem"("slug");

-- MenuItem: add nutrition and diet columns
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "ingredients" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "allergens" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "dietTags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "dishType" "DishType" NOT NULL DEFAULT 'MAIN';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "calories" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "protein" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "carbs" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "fat" INTEGER;

-- RestaurantSettings: rename deliveryRadiusKm -> freeDeliveryRadiusKm, add longDistanceFeeKzt
DO $$ BEGIN
  ALTER TABLE "RestaurantSettings" RENAME COLUMN "deliveryRadiusKm" TO "freeDeliveryRadiusKm";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
ALTER TABLE "RestaurantSettings" ADD COLUMN IF NOT EXISTS "longDistanceFeeKzt" INTEGER NOT NULL DEFAULT 1500;

-- Order: add distanceKm
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "distanceKm" DOUBLE PRECISION;
