import { createDb } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🔄 Running database migrations...');
  
  const db = createDb();
  
  try {
    // Read migration files
    const migrationDir = path.join(__dirname, '../src/db/migrations');
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await db.execute(statement);
          } catch (error) {
            console.error(`❌ Error executing migration ${file}:`, error);
            process.exit(1);
          }
        }
      }
      
      console.log(`✅ Migration ${file} completed`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
