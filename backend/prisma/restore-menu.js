const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.menuItem.updateMany({ where: {}, data: { isActive: true } })
  .then((r) => { console.log('Restored menu items:', r.count); return p.$disconnect(); })
  .catch((e) => { console.error('Restore failed:', e); return p.$disconnect(); });
