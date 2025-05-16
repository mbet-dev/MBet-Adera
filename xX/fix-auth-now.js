// MBet-Adera Auth Fix Script
// Run this with: node fix-auth-now.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key (needs admin privileges)
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

// Default password for all users
const DEFAULT_PASSWORD = 'MBet@2023';

async function fixAuthUsers() {
  console.log('Starting MBet-Adera user authentication fix...');
  
  try {
    // Step 1: Get all profiles
    console.log('Fetching profiles from database...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    
    console.log(`Found ${profiles.length} profiles to process`);
    
    // Step 2: Process each profile
    console.log('Processing profiles and fixing auth issues...');
    
    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const profile of profiles) {
      try {
        // Skip profiles without email
        if (!profile.email) {
          console.log(`Skipping profile ${profile.id} - no email`);
          skippedCount++;
          continue;
        }
        
        // Step 3: Check if user exists in auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        
        if (authUser && authUser.user) {
          // User exists, reset password and ensure verified
          console.log(`Updating existing auth user: ${profile.email}`);
          
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            profile.id,
            { 
              password: DEFAULT_PASSWORD,
              email_confirm: true,
              user_metadata: {
                name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone_number: profile.phone_number,
                role: profile.role || 'customer'
              }
            }
          );
          
          if (updateError) {
            console.error(`Error updating user ${profile.email}: ${updateError.message}`);
            errorCount++;
          } else {
            fixedCount++;
          }
        } else {
          // User doesn't exist, create new auth user
          console.log(`Creating new auth user: ${profile.email}`);
          
          // Use admin createUser function to preserve the same UUID
          const { error: createError } = await supabase.auth.admin.createUser({
            uuid: profile.id,
            email: profile.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
              first_name: profile.first_name,
              last_name: profile.last_name, 
              phone_number: profile.phone_number,
              role: profile.role || 'customer'
            }
          });
          
          if (createError) {
            console.error(`Error creating user ${profile.email}: ${createError.message}`);
            errorCount++;
          } else {
            fixedCount++;
          }
        }
      } catch (userError) {
        console.error(`Error processing profile ${profile.id}: ${userError.message}`);
        errorCount++;
      }
    }
    
    // Final report
    console.log('\n=== AUTH FIX COMPLETE ===');
    console.log(`Total profiles processed: ${profiles.length}`);
    console.log(`Successfully fixed: ${fixedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log(`Skipped profiles: ${skippedCount}`);
    console.log(`All users now have password: ${DEFAULT_PASSWORD}`);
    console.log('==============================\n');
    
    if (errorCount > 0) {
      console.log('Some errors occurred during the process. Check the logs above for details.');
      console.log('You may need to fix these users manually or run the script again.');
    } else {
      console.log('✅ All users have been fixed successfully!');
      console.log('You can now log in with any email and password: MBet@2023');
    }
    
  } catch (error) {
    console.error('CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixAuthUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 