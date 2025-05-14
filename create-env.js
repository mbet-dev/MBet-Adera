// Create .env file for MBet-Adera authentication fix
// Run this script and follow the prompts to create a .env file
// Run with: node create-env.js

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('MBet-Adera Authentication Fix - .env File Creator');
console.log('=================================================');
console.log('This script will create a .env file with your Supabase URL and service role key');
console.log('You can find your service role key in your Supabase dashboard:');
console.log('  1. Go to https://app.supabase.com/');
console.log('  2. Select your project');
console.log('  3. Go to Project Settings > API');
console.log('  4. Find "service_role" key (NOT the anon key)\n');

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createEnvFile() {
  // Default URL from the script
  let supabaseUrl = 'https://jaqwviuxhxsxypmffece.supabase.co';
  
  // Ask for the URL if the user wants to customize it
  const customizeUrl = await prompt('Use default Supabase URL? (Y/n): ');
  if (customizeUrl.toLowerCase() === 'n') {
    supabaseUrl = await prompt('Enter your Supabase URL (e.g. https://yourproject.supabase.co): ');
  }
  
  // Always ask for the service role key
  const serviceRoleKey = await prompt('Enter your service_role key: ');
  
  if (!serviceRoleKey) {
    console.log('\nERROR: Service role key is required.');
    process.exit(1);
  }
  
  // Create or overwrite the .env file
  const envContent = `SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('\nSuccess! .env file created with your Supabase credentials.');
    console.log('You can now run the authentication fix scripts.');
  } catch (error) {
    console.error('\nError creating .env file:', error.message);
  }
  
  rl.close();
}

createEnvFile(); 