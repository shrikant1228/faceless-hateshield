const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hash = await bcrypt.hash('#ss1228..', 10);
    const user = await prisma.user.create({
      data: {
        email: 'shrikantmathpati@gmail.com',
        displayName: 'Admin',
        passwordHash: hash,
        isAdmin: true
      }
    });
    console.log('✅ Admin created on Render:', user.email);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ User already exists! Updating to admin...');
      const updated = await prisma.user.update({
        where: { email: 'shrikantmathpati@gmail.com' },
        data: { isAdmin: true }
      });
      console.log('✅ Updated!', updated.email, 'is now admin');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();