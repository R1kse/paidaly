const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const convert = (s) => Buffer.from(s, 'latin1').toString('utf8');
const isBad = (s) => typeof s === 'string' && (s.includes('A') || s.includes('A') || s.includes('?') || s.includes('N') || s.includes('?'));

async function fix() {
  const cats = await prisma.menuCategory.findMany();
  for (const c of cats) {
    const title = isBad(c.title) ? convert(c.title) : c.title;
    const description = c.description && isBad(c.description) ? convert(c.description) : c.description;
    if (title !== c.title || description !== c.description) {
      await prisma.menuCategory.update({ where: { id: c.id }, data: { title, description } });
    }
  }

  const items = await prisma.menuItem.findMany();
  for (const i of items) {
    const title = isBad(i.title) ? convert(i.title) : i.title;
    const description = i.description && isBad(i.description) ? convert(i.description) : i.description;
    const ingredients = i.ingredients && isBad(i.ingredients) ? convert(i.ingredients) : i.ingredients;
    if (title !== i.title || description !== i.description || ingredients !== i.ingredients) {
      await prisma.menuItem.update({ where: { id: i.id }, data: { title, description, ingredients } });
    }
  }

  const groups = await prisma.modifierGroup.findMany();
  for (const g of groups) {
    const title = isBad(g.title) ? convert(g.title) : g.title;
    if (title !== g.title) {
      await prisma.modifierGroup.update({ where: { id: g.id }, data: { title } });
    }
  }
  const options = await prisma.modifierOption.findMany();
  for (const o of options) {
    const title = isBad(o.title) ? convert(o.title) : o.title;
    if (title !== o.title) {
      await prisma.modifierOption.update({ where: { id: o.id }, data: { title } });
    }
  }
}

fix()
  .then(() => console.log('Mojibake fixed'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());