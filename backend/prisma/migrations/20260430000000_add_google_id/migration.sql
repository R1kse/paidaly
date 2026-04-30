-- AlterTable: add googleId to User
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- CreateIndex: unique index on googleId
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
