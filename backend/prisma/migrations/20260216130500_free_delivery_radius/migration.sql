-- Manual migration: switch to freeDeliveryRadiusKm/longDistanceFeeKzt
ALTER TABLE "RestaurantSettings" ADD COLUMN "freeDeliveryRadiusKm" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "RestaurantSettings" ADD COLUMN "longDistanceFeeKzt" INTEGER NOT NULL DEFAULT 1500;
UPDATE "RestaurantSettings"
SET "freeDeliveryRadiusKm" = COALESCE("deliveryRadiusKm", 4),
    "longDistanceFeeKzt" = COALESCE("deliverySurchargeKzt", 1500);
ALTER TABLE "RestaurantSettings" DROP COLUMN "deliveryRadiusKm";
ALTER TABLE "RestaurantSettings" DROP COLUMN "baseDeliveryFeeKzt";
ALTER TABLE "RestaurantSettings" DROP COLUMN "deliverySurchargeKzt";
