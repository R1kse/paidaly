-- Add googleId column (nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- Make passwordHash nullable (was NOT NULL in init)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Create unique index on googleId (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
