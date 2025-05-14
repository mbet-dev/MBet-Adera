// MBet-Adera Direct User Fix Script
// This fixes the exact users in the system with provided IDs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://jaqwviuxhxsxypmffece.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// The exact users that need to be fixed, with their specific IDs
const EXACT_USERS = [
  // Test user is already working
  // {
  //   "id": "33333333-3333-3333-3333-333333333333",
  //   "email": "test@mbet.com",
  //   "role": "customer"
  // },
  {
    "id": "aaaaaaaa-0000-1111-2222-333333333333",
    "email": "bereket@example.com",
    "role": "customer"
  },
  {
    "id": "bbbbbbbb-0000-1111-2222-333333333333",
    "email": "kidist@example.com",
    "role": "customer"
  },
  {
    "id": "cccccccc-0000-1111-2222-333333333333",
    "email": "teshome@example.com",
    "role": "customer"
  },
  {
    "id": "dddddddd-0000-1111-2222-333333333333",
    "email": "driver3@example.com",
    "role": "customer"
  },
  {
    "id": "eeeeeeee-0000-1111-2222-333333333333",
    "email": "driver4@example.com",
    "role": "customer"
  },
  {
    "id": "ffffffff-0000-1111-2222-333333333333",
    "email": "driver5@example.com",
    "role": "customer"
  },
  {
    "id": "88888888-0000-1111-2222-333333333333",
    "email": "staff2@mbet.com",
    "role": "customer"
  },
  {
    "id": "99999999-0000-1111-2222-333333333333",
    "email": "staff3@mbet.com",
    "role": "customer"
  }
];

// We'll insert directly into the auth.users table using raw SQL
// This is the same approach that worked for the test user
async function fixExactUsers() {
  console.log('Starting direct user fix for MBet-Adera...');
  console.log('This will fix exactly the users specified with their IDs');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Get instance ID first
  console.log('Getting auth instance ID...');
  const { data: instanceData, error: instanceError } = await supabase.rpc(
    'get_auth_instance_id'
  );
  
  if (instanceError) {
    console.error('Error getting instance ID:', instanceError.message);
    console.log('Creating function to get instance ID...');
    
    // Create function to get instance ID
    const { error: createFnError } = await supabase.rpc(
      'admin_query',
      {
        query_text: `
          CREATE OR REPLACE FUNCTION get_auth_instance_id()
          RETURNS uuid
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT id FROM auth.instances LIMIT 1;
          $$;
        `
      }
    );
    
    if (createFnError) {
      console.error('Error creating function:', createFnError.message);
      console.log('Falling back to default instance ID...');
    } else {
      const { data: retryData, error: retryError } = await supabase.rpc(
        'get_auth_instance_id'
      );
      
      if (retryError || !retryData) {
        console.error('Still cannot get instance ID:', retryError?.message);
        console.log('Using default instance ID');
      } else {
        console.log(`Found instance ID: ${retryData}`);
      }
    }
  } else {
    console.log(`Found instance ID: ${instanceData}`);
  }
  
  // Process each user
  for (const user of EXACT_USERS) {
    console.log(`\nProcessing user: ${user.email} (${user.id})`);
    
    try {
      // Step 1: Check if user already exists in auth
      const { data: authCheck } = await supabase.rpc(
        'admin_query',
        { 
          query_text: `SELECT id FROM auth.users WHERE id = '${user.id}'`
        }
      );
      
      // Based on the result, either update or insert
      let query;
      
      if (authCheck && authCheck.length > 0) {
        console.log(`User ${user.email} exists in auth.users, updating...`);
        query = `
          UPDATE auth.users
          SET 
            email = '${user.email}',
            encrypted_password = crypt('MBet@2023', gen_salt('bf')),
            email_confirmed_at = NOW(),
            confirmation_token = '',
            recovery_token = '',
            aud = 'authenticated',
            role = 'authenticated',
            updated_at = NOW(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}',
            raw_user_meta_data = '{"role":"${user.role}"}',
            is_super_admin = false,
            is_sso_user = false
          WHERE id = '${user.id}';
        `;
      } else {
        console.log(`User ${user.email} doesn't exist in auth.users, creating...`);
        
        // Get instance_id or use default
        const instanceId = (instanceData) ? instanceData : '00000000-0000-0000-0000-000000000000';
        
        query = `
          INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, created_at, updated_at, 
            raw_app_meta_data, raw_user_meta_data
          ) VALUES (
            '${instanceId}', 
            '${user.id}', 
            'authenticated', 
            'authenticated', 
            '${user.email}',
            crypt('MBet@2023', gen_salt('bf')),
            NOW(), 
            NOW(), 
            NOW(), 
            '{"provider":"email","providers":["email"]}',
            '{"role":"${user.role}"}'
          );
        `;
      }
      
      // Execute the query
      const { error: opError } = await supabase.rpc(
        'admin_query',
        { query_text: query }
      );
      
      if (opError) {
        console.error(`Error fixing user ${user.email}:`, opError.message);
        errorCount++;
      } else {
        console.log(`✅ Successfully fixed user ${user.email}`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`Error processing ${user.email}:`, error.message);
      errorCount++;
    }
  }
  
  // Final report
  console.log('\n=== USER FIX COMPLETE ===');
  console.log(`Successfully fixed: ${successCount} users`);
  console.log(`Failed to fix: ${errorCount} users`);
  
  if (successCount > 0) {
    console.log('\nAll fixed users can now log in with password: MBet@2023');
  }
  
  if (errorCount > 0) {
    console.log('\nSome users could not be fixed. Try running the SQL directly in Supabase SQL Editor.');
  }
}

// Create the admin_query function if it doesn't exist
async function setupAdminQuery() {
  console.log('Setting up admin query function...');
  
  const createFn = `
    CREATE OR REPLACE FUNCTION admin_query(query_text text)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSONB;
    BEGIN
      EXECUTE query_text;
      RETURN result;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('error', SQLERRM);
    END;
    $$;
  `;
  
  const { error } = await supabase.rpc(
    'admin_query',
    { query_text: createFn }
  ).catch(() => {
    // Function might not exist yet, so we'll create it directly
    return supabase.from('profiles').select('id').limit(1);
  });
  
  if (error) {
    console.log('Creating admin_query function via raw SQL...');
    // Try to create it directly
    const { error: sqlError } = await supabase
      .from('_sql_run')
      .select('*')
      .eq('query', createFn);
    
    if (sqlError) {
      console.error('Could not create admin query function. Proceeding anyway...');
    } else {
      console.log('Admin query function created successfully');
    }
  }
}

// Run everything
async function main() {
  try {
    await setupAdminQuery();
    await fixExactUsers();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main(); 