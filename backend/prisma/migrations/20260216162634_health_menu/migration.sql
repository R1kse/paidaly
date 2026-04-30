-- CreateEnum
CREATE TYPE "DishType" AS ENUM ('BREAKFAST', 'SOUP', 'MAIN', 'SALAD', 'SNACK', 'DESSERT', 'DRINK');

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dietTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dishType" "DishType" NOT NULL DEFAULT 'MAIN',
ADD COLUMN     "ingredients" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_slug_key" ON "MenuCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_slug_key" ON "MenuItem"("slug");