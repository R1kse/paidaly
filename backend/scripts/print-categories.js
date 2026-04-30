const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());