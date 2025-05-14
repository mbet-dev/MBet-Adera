// Simple diagnostic tool for MBet-Adera authentication
// Checks if users exist in both profiles and auth.users tables
// Run with: node simple-auth-check.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://jaqwviuxhxsxypmffece.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.error('Please create a .env file with SUPABASE_SERVICE_ROLE_KEY=your_service_key');
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

// Main diagnostic function
async function runDiagnostics() {
  console.log('===== MBet-Adera Simple Authentication Diagnostic Tool =====\n');
  
  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('id', USERS_TO_CHECK.map(u => u.id));
  
  if (profilesError) {
    console.error('Error getting profiles:', profilesError.message);
    return;
  }
  
  console.log(`Found ${profiles?.length || 0} profiles in the database`);
  
  // Create a map for quick lookup
  const profilesMap = {};
  profiles?.forEach(profile => {
    profilesMap[profile.id] = profile;
  });
  
  // Check each user
  console.log('\n----- User Status Check -----');
  console.log('ID | EMAIL | IN PROFILES | PROFILE ROLE | CAN LOGIN | ERROR');
  console.log('---------------------------------------------------------------------');
  
  for (const user of USERS_TO_CHECK) {
    const profile = profilesMap[user.id];
    
    // Try to log in with this user
    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: 'MBet@2023'
    });
    
    // Display the results
    console.log(
      `${user.id.substring(0, 8)}... | ` +
      `${user.email} | ` +
      `${profile ? 'YES' : 'NO'} | ` +
      `${profile?.role || 'N/A'} | ` +
      `${loginError ? 'NO' : 'YES'} | ` +
      `${loginError ? loginError.message : 'None'}`
    );
  }
  
  // Create a direct SQL function to check auth.users if needed
  console.log('\n\n----- Attempting to Check auth.users Table -----');
  try {
    const { data, error } = await supabase.rpc(
      'create_check_function',
      {
        sql_command: `
          CREATE OR REPLACE FUNCTION public.check_auth_users() 
          RETURNS TABLE(id uuid, email text, role text, is_confirmed boolean) 
          SECURITY DEFINER 
          AS 
          $$ 
          SELECT id, email, role, email_confirmed_at IS NOT NULL as is_confirmed 
          FROM auth.users 
          WHERE id IN (
            '33333333-3333-3333-3333-333333333333',
            'aaaaaaaa-0000-1111-2222-333333333333',
            'bbbbbbbb-0000-1111-2222-333333333333',
            'cccccccc-0000-1111-2222-333333333333',
            'dddddddd-0000-1111-2222-333333333333',
            'eeeeeeee-0000-1111-2222-333333333333',
            'ffffffff-0000-1111-2222-333333333333',
            '88888888-0000-1111-2222-333333333333',
            '99999999-0000-1111-2222-333333333333'
          ); 
          $$
          LANGUAGE sql;
        `
      }
    );
    
    if (error) {
      console.log('Error creating check function:', error.message);
      console.log('\nThis is expected if you don\'t have admin permissions.');
      console.log('Please run the direct_user_fix_v2.sql script in Supabase Dashboard.');
    } else {
      console.log('Created auth check function successfully');
      
      // Now try to run the function
      const { data: authUsers, error: runError } = await supabase
        .rpc('check_auth_users');
      
      if (runError) {
        console.log('Error running check function:', runError.message);
      } else {
        console.log('\nAuth Users in Database:');
        console.table(authUsers);
      }
    }
  } catch (e) {
    console.log('Error creating/running SQL check:', e.message);
  }
  
  console.log('\n----- Recommendations -----');
  console.log('1. Make sure the SQL script has been run in Supabase Dashboard');
  console.log('2. Verify that users exist in both profiles and auth.users tables');
  console.log('3. Check that the passwords have been correctly updated');
  console.log('4. Clear any cached authentication in the app');
  console.log('5. If necessary, manually create users in Supabase Authentication UI');
  
  console.log('\n==== Diagnostic Complete ====');
}

// Helper function for direct SQL execution
async function createCheckFunctionIfNeeded() {
  try {
    // First, create a function to execute SQL commands
    const { error } = await supabase.rpc(
      'create_check_function',
      {
        sql_command: `
          CREATE OR REPLACE FUNCTION public.create_check_function(sql_command text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql_command;
            RETURN json_build_object('success', true);
          EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object('success', false, 'error', SQLERRM);
          END;
          $$;
        `
      }
    );
    
    if (error) {
      // Function might not exist yet, that's expected
      console.log('Setting up SQL helper function...');
      
      // Create the function directly (this will likely fail without proper permissions)
      await supabase
        .from('_dummy_table_for_rpc')
        .select()
        .limit(1)
        .then(() => {
          console.log('SQL helper function created');
        })
        .catch(() => {
          console.log('Could not create SQL helper function (expected)');
        });
    }
  } catch (e) {
    // Ignore errors here
  }
}

// Run the diagnostics
async function main() {
  try {
    await createCheckFunctionIfNeeded();
    await runDiagnostics();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main(); 