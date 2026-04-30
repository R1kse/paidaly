-- Make passwordHash nullable to support Google OAuth users (no password)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
