import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial TCT DeployForge database...');

  await prisma.tenant.upsert({
    where: { id: 'sandbox-tenant-12345' },
    update: {},
    create: {
      id: 'sandbox-tenant-12345',
      displayName: 'Contoso Corp (Sandbox)',
      authMode: 'simulation',
      clientId: 'mock-client-id-001',
      isSimulation: true,
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
