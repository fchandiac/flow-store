import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seedProductionDirect() {
  console.log('\n🚀 Starting production seed (direct SQL)...');
  console.log('═══════════════════════════════════════════════════════════');

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: '72.61.6.232',
      user: 'next-elect',
      password: 'redbull90',
      database: 'next-start',
    });

    console.log('✓ Connected to database');

    // Check if admin exists
    const [rows]: any = await connection.execute(
      'SELECT id FROM users WHERE userName = ?',
      ['admin']
    );

    if (rows.length > 0) {
      console.log('\n⚠️  Admin user already exists');
      console.log('   Username: admin');
      console.log('   Password: 1234 (update if needed)');

      // Update password just to make sure
      const hashedPassword = await bcrypt.hash('1234', 10);
      await connection.execute(
        'UPDATE users SET pass = ? WHERE userName = ?',
        [hashedPassword, 'admin']
      );
      console.log('\n✓ Password reset to: 1234');

      console.log('───────────────────────────────────────────────────────────');
      await connection.end();
      process.exit(0);
    }

    // Create person
    console.log('\n👤 Creating admin person...');
    let personId = uuidv4();
    const adminEmail = 'admin@electnext.com';
    const adminPhone = '+56900000000';

    try {
      await connection.execute(
        `INSERT INTO persons (id, name, dni, phone, mail, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [personId, 'Administrator', '00000000-0', adminPhone, adminEmail]
      );
      console.log(`✓ Person created: Administrator`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log('ℹ Admin person already exists, using existing...');
        // Get existing person
        const [persons]: any = await connection.execute(
          'SELECT id FROM persons WHERE dni = ?',
          ['00000000-0']
        );
        if (persons.length > 0) {
          personId = persons[0].id;
        }
      } else {
        throw e;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('1234', 10);

    // Create user
    console.log('\n👨‍💼 Creating admin user...');
    const userId = uuidv4();

    await connection.execute(
      `INSERT INTO users (id, userName, pass, mail, rol, personId, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, 'admin', hashedPassword, adminEmail, 'ADMIN', personId]
    );
    console.log(`✓ User created: admin`);
    console.log(`   Role: ADMIN`);
    console.log(`   Email: ${adminEmail}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Production seed completed successfully!');
    console.log('\n🔑 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: 1234');
    console.log('───────────────────────────────────────────────────────────');

    await connection.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n───────────────────────────────────────────────────────────');
    console.error('❌ Seed failed:');
    console.error(error.message);

    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // ignore
      }
    }

    process.exit(1);
  }
}

seedProductionDirect();
