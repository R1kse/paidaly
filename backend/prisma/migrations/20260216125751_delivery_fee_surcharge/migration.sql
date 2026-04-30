-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "distanceKm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "baseDeliveryFeeKzt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliverySurchargeKzt" INTEGER NOT NULL DEFAULT 1500;
