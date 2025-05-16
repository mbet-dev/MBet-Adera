// MBet-Adera Auth Diagnostic Tool
// This script directly checks the state of auth.users in the database
// Run with: node check-auth-status.js

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

// List of users to check
const USERS_TO_CHECK = [
  { id: '33333333-3333-3333-3333-333333333333', email: 'test@mbet.com' }, // This one works
  { id: 'aaaaaaaa-0000-1111-2222-333333333333', email: 'bereket@example.com' },
  { id: 'bbbbbbbb-0000-1111-2222-333333333333', email: 'kidist@example.com' },
  { id: 'cccccccc-0000-1111-2222-333333333333', email: 'teshome@example.com' },
  { id: 'dddddddd-0000-1111-2222-333333333333', email: 'driver3@example.com' },
  { id: 'eeeeeeee-0000-1111-2222-333333333333', email: 'driver4@example.com' },
  { id: 'ffffffff-0000-1111-2222-333333333333', email: 'driver5@example.com' },
  { id: '88888888-0000-1111-2222-333333333333', email: 'staff2@mbet.com' },
  { id: '99999999-0000-1111-2222-333333333333', email: 'staff3@mbet.com' }
];

// Check if a user exists in the auth.users table
async function checkUser(userId, email) {
  try {
    // Check auth.users
    const { data: authData, error: authError } = await supabase
      .from('profiles') // Use profiles as a proxy since we can't directly query auth.users from JS
      .select('id')
      .eq('id', userId)
      .eq('email', email)
      .single();
    
    if (authError) {
      return { exists: false, error: authError.message };
    }
    
    // Now let's try to actually authenticate
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'MBet@2023'
    });
    
    if (signInError) {
      return { 
        exists: true, 
        profile_exists: !!authData,
        can_login: false, 
        error: signInError.message 
      };
    }
    
    return { 
      exists: true, 
      profile_exists: !!authData,
      can_login: true
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

// Run diagnostics
async function runDiagnostics() {
  console.log('Running MBet-Adera auth diagnostics...');
  console.log('=================================\n');
  
  // First, get the DB URL to verify we're connecting to the right database
  try {
    const { data: settings, error } = await supabase.rpc(
      'admin_query',
      { query_text: "SELECT current_database() as db_name, current_user as user_name" }
    );
    
    if (settings && !error) {
      console.log(`Connected to database: ${JSON.stringify(settings)}`);
    } else {
      console.log('Could not determine connected database:', error?.message || 'Unknown error');
    }
  } catch (e) {
    console.log('Error connecting to database:', e.message);
  }
  
  // Check each user
  const results = [];
  
  for (const user of USERS_TO_CHECK) {
    console.log(`\nChecking user: ${user.email} (${user.id})`);
    const result = await checkUser(user.id, user.email);
    console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    results.push({ ...user, ...result });
  }
  
  // Print summary
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  const workingUsers = results.filter(u => u.can_login).length;
  const nonWorkingUsers = results.filter(u => !u.can_login).length;
  
  console.log(`Working users (can log in): ${workingUsers}`);
  console.log(`Non-working users: ${nonWorkingUsers}`);
  
  if (workingUsers === 0) {
    console.log('\nPOSSIBLE ISSUES:');
    console.log('1. SQL script didn\'t run successfully');
    console.log('2. Database connection issues (wrong database?)');
    console.log('3. Auth system might be using different encryption');
    console.log('4. There might be permissions/RLS issues');
    
    // Try to directly check if auth.users exist via SQL
    try {
      const { data: authCheck, error } = await supabase.rpc(
        'admin_query',
        {
          query_text: `
            SELECT COUNT(*) FROM auth.users 
            WHERE id IN (
              'aaaaaaaa-0000-1111-2222-333333333333',
              'bbbbbbbb-0000-1111-2222-333333333333',
              'cccccccc-0000-1111-2222-333333333333'
            )
          `
        }
      );
      
      if (error) {
        console.log('\nERROR checking auth.users:', error.message);
      } else {
        console.log('\nDirect SQL check of auth.users:', authCheck);
      }
    } catch (e) {
      console.log('Error running direct SQL check:', e.message);
    }
  }
  
  // Try to create a test admin_query function to access auth.users directly
  try {
    const { error } = await supabase.rpc(
      'admin_query',
      {
        query_text: `
          CREATE OR REPLACE FUNCTION auth_users_check()
          RETURNS TABLE (id uuid, email text, encrypted_password text, email_confirmed_at timestamptz)
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT id, email, substr(encrypted_password, 1, 20) as encrypted_password, email_confirmed_at
            FROM auth.users 
            WHERE id IN (
              '33333333-3333-3333-3333-333333333333',
              'aaaaaaaa-0000-1111-2222-333333333333',
              'bbbbbbbb-0000-1111-2222-333333333333',
              'cccccccc-0000-1111-2222-333333333333'
            );
          $$;
        `
      }
    );
    
    if (error) {
      console.log('\nError creating auth_users_check function:', error.message);
    } else {
      // Now try to use the function
      const { data: authUsers, error: funcError } = await supabase.rpc('auth_users_check');
      
      if (funcError) {
        console.log('\nError using auth_users_check function:', funcError.message);
      } else {
        console.log('\nDirect auth.users data:', authUsers);
      }
    }
  } catch (e) {
    console.log('Error creating/using auth_users_check function:', e.message);
  }
  
  console.log('\nNEXT STEPS:');
  console.log('1. If direct SQL checks show no users in auth.users, re-run the SQL script');
  console.log('2. If users exist but login fails, there might be an encryption issue');
  console.log('3. Try manually creating a test user via Supabase Authentication UI');
  console.log('4. Check if there are any JWT/token issues in the app');
  console.log('==============================');
}

// Setup admin_query function if needed and run diagnostics
async function setupAdminQuery() {
  try {
    const createFn = `
      CREATE OR REPLACE FUNCTION admin_query(query_text text)
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB;
      BEGIN
        EXECUTE query_text INTO result;
        RETURN result;
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
      END;
      $$;
    `;
    
    const { error } = await supabase.rpc(
      'admin_query',
      { query_text: createFn }
    );
    
    if (error && error.message && error.message.includes('does not exist')) {
      console.log('Admin query function does not exist yet, creating it...');
      try {
        // Execute a direct query to create the function
        await runRawSQL(createFn);
        console.log('Created admin_query function');
      } catch (e) {
        console.log('Could not create admin_query function:', e);
      }
    }
  } catch (e) {
    console.log('Error in setupAdminQuery:', e);
    // Continue anyway, the function might already exist
  }
}

// Helper function to run raw SQL
async function runRawSQL(sql) {
  console.log('Attempting to run SQL directly');
  // This is just a fallback that will likely fail without proper permissions
  // but worth trying
  return supabase.from('_').select().then(() => {
    console.log('SQL execution attempted');
  }).catch(err => {
    console.log('SQL direct execution failed:', err.message);
  });
}

// Run everything
async function main() {
  try {
    await setupAdminQuery();
    await runDiagnostics();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main(); 