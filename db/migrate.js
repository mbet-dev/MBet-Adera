const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing SQL file: ${filePath}`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error executing SQL file ${filePath}:`, error);
      return false;
    }
    
    console.log(`SQL file ${filePath} executed successfully.`);
    return true;
  } catch (error) {
    console.error(`Error reading or executing SQL file ${filePath}:`, error);
    return false;
  }
}

async function migrateDatabase() {
  console.log('Starting database migration...');
  
  // Path to the functions directory
  const functionsDir = path.join(__dirname, 'functions');
  
  // Get all SQL files in the functions directory
  const files = fs.readdirSync(functionsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(functionsDir, file));
  
  console.log(`Found ${files.length} SQL files to execute.`);
  
  // Execute each SQL file
  for (const file of files) {
    const success = await executeSQLFile(file);
    if (!success) {
      console.error(`Migration failed at file: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('Migration completed successfully!');
}

// Run the migration
migrateDatabase().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 