const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPaginationFunction() {
  try {
    console.log('Applying pagination function to database...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'get_paginated_parcels_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('pg_execute', { sql });
    
    if (error) {
      console.error('Error applying pagination function:', error);
      process.exit(1);
    }
    
    console.log('Successfully applied pagination function to database!');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
applyPaginationFunction(); 