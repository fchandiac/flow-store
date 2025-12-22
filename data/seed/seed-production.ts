import { getDb } from '../db';
import { User } from '../entities/User';
import { Person } from '../entities/Person';
import bcrypt from 'bcryptjs';
import { UserRole } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';

async function seedProduction() {
  const db = await getDb();

  console.log('\n🚀 Starting production seed...');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.userName = :userName', { userName: 'admin' })
      .getOne();

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('   User: admin');
      console.log('   Email: admin@electnext.com');
      process.exit(0);
    }

    // Create Person for admin
    console.log('\n👤 Creating admin person...');
    const person = new Person();
    person.id = uuidv4();
    person.name = 'Administrator';
    person.dni = '00000000-0';
    person.phone = '+56900000000';
    person.mail = 'admin@electnext.com';

    const savedPerson = await db.getRepository(Person).save(person);
    console.log(`✓ Person created: ${savedPerson.name} (${savedPerson.id})`);

    // Create admin user
    console.log('\n👨‍💼 Creating admin user...');
    const adminUser = new User();
    adminUser.id = uuidv4();
    adminUser.userName = 'admin';
    adminUser.pass = await bcrypt.hash('1234', 10);
    adminUser.mail = 'admin@electnext.com';
    adminUser.rol = UserRole.ADMIN;
    adminUser.person = savedPerson;

    const savedUser = await db.getRepository(User).save(adminUser);
    console.log(`✓ User created: ${savedUser.userName}`);
    console.log(`   Role: ${savedUser.rol}`);
    console.log(`   Email: ${savedUser.mail}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Production seed completed successfully!');
    console.log('\n🔑 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: 1234');
    console.log('───────────────────────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('\n───────────────────────────────────────────────────────────');
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  }
}

seedProduction();
