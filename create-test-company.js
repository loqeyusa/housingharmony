import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTestCompany() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create test company
    const companyResult = await client.query(`
      INSERT INTO companies (name, display_name, email, phone, address, contact_person_name, contact_person_email, contact_person_phone, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id
    `, [
      'Test Housing Corp',
      'Test Housing Corporation',
      'admin@testhousing.com',
      '+1-555-0123',
      '123 Test Street, Test City, TC 12345',
      'Test Administrator',
      'admin@testhousing.com',
      '+1-555-0123',
      'active'
    ]);
    
    const companyId = companyResult.rows[0].id;
    console.log('Created company with ID:', companyId);
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const userResult = await client.query(`
      INSERT INTO users (company_id, username, email, first_name, last_name, password_hash, is_enabled, is_super_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id
    `, [
      companyId,
      'testadmin',
      'admin@testhousing.com',
      'Test',
      'Administrator',
      hashedPassword,
      true,
      false
    ]);
    
    const userId = userResult.rows[0].id;
    console.log('Created user with ID:', userId);
    
    // Get Administrator role
    const roleResult = await client.query(`
      SELECT id FROM roles WHERE name = 'Administrator'
    `);
    
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      
      // Assign Administrator role to user
      await client.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by_id, assigned_at)
        VALUES ($1, $2, $3, NOW())
      `, [userId, roleId, userId]);
      
      console.log('Assigned Administrator role to user');
    }
    
    await client.query('COMMIT');
    
    console.log('\n=== Test Company Created Successfully ===');
    console.log('Company: Test Housing Corporation');
    console.log('Username: testadmin');
    console.log('Password: password123');
    console.log('Email: admin@testhousing.com');
    console.log('Company ID:', companyId);
    console.log('User ID:', userId);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test company:', error);
  } finally {
    client.release();
  }
}

createTestCompany().catch(console.error);