import app from './app.js';
import dotenv from 'dotenv';
import { prisma } from './prisma.js';

dotenv.config();

const port = process.env.PORT || 4000;

async function seedDefaults() {
  const defaults = ['Flight','Hotel','Food','Transport','Shopping','Entertainment'];
  for (const name of defaults) {
    try {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, custom: false }
      });
    } catch (e) {
      console.error('Seed category error', name, e);
    }
  }
}

seedDefaults().finally(() => {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
});
