import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin
  const adminPassword = await bcrypt.hash('Admin2026*', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@courseforge.com' },
    update: {},
    create: {
      email: 'admin@courseforge.com',
      password_hash: adminPassword,
      full_name: 'Administrador',
      role: UserRole.ADMIN,
      active: true,
    },
  });
  console.log(`Admin created: ${admin.email}`);

  // Create sample creator
  const creatorPassword = await bcrypt.hash('Creator2026*', 12);
  const creator = await prisma.user.upsert({
    where: { email: 'creator@courseforge.com' },
    update: {},
    create: {
      email: 'creator@courseforge.com',
      password_hash: creatorPassword,
      full_name: 'Creador Demo',
      role: UserRole.CREATOR,
      active: true,
    },
  });
  await prisma.creatorProfile.upsert({
    where: { user_id: creator.id },
    update: {},
    create: { user_id: creator.id, bio: 'Creador de contenido educativo' },
  });
  console.log(`Creator created: ${creator.email}`);

  // Create sample student
  const studentPassword = await bcrypt.hash('Student2026*', 12);
  const student = await prisma.user.upsert({
    where: { email: 'student@courseforge.com' },
    update: {},
    create: {
      email: 'student@courseforge.com',
      password_hash: studentPassword,
      full_name: 'Estudiante Demo',
      role: UserRole.STUDENT,
      active: true,
    },
  });
  await prisma.studentProfile.upsert({
    where: { user_id: student.id },
    update: {},
    create: { user_id: student.id, timezone: 'America/Bogota', preferred_language: 'es' },
  });
  console.log(`Student created: ${student.email}`);

  // Create categories
  const categories = [
    { slug: 'programacion', name: 'Programación', description: 'Cursos de programación y desarrollo de software' },
    { slug: 'marketing-digital', name: 'Marketing Digital', description: 'Estrategias de marketing online y redes sociales' },
    { slug: 'diseno', name: 'Diseño', description: 'Diseño gráfico, UI/UX y creatividad visual' },
    { slug: 'negocios', name: 'Negocios', description: 'Emprendimiento, finanzas y gestión empresarial' },
    { slug: 'inteligencia-artificial', name: 'Inteligencia Artificial', description: 'Machine learning, deep learning y aplicaciones de IA' },
    { slug: 'idiomas', name: 'Idiomas', description: 'Aprende nuevos idiomas con metodología efectiva' },
    { slug: 'fotografia-video', name: 'Fotografía y Video', description: 'Producción audiovisual y edición' },
    { slug: 'musica', name: 'Música', description: 'Instrumentos, producción musical y teoría' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`${categories.length} categories created`);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
