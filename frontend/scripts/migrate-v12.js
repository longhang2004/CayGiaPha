// Standalone script to migrate the database schema by adding password_hash.
// Usage: node scripts/migrate-v12.js [env_file_path]
// Example: node scripts/migrate-v12.js .env.development

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = process.argv[2] || '.env.development';
console.log(`Loading env file: ${envFile}`);

const envPath = path.resolve(process.cwd(), envFile);
if (!fs.existsSync(envPath)) {
  console.error(`Env file not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.trim().startsWith('DATABASE_URL='));

if (!dbUrlLine) {
  console.error('DATABASE_URL not found in the env file');
  process.exit(1);
}

// Extract URL, remove quotes if present
let databaseUrl = dbUrlLine.substring('DATABASE_URL='.length).trim();
if ((databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) || (databaseUrl.startsWith('"') && databaseUrl.endsWith('"'))) {
  databaseUrl = databaseUrl.substring(1, databaseUrl.length - 1);
}

console.log(`Connecting to database...`);
const sql = `ALTER TABLE users ADD COLUMN password_hash TEXT;`;

async function run() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });
  try {
    await client.connect();
    console.log("Connected successfully. Executing: ALTER TABLE users ADD COLUMN password_hash TEXT;");
    await client.query(sql);
    console.log("Migration completed successfully!");
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log("Column password_hash already exists. Skipping.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    await client.end();
  }
}

run();
