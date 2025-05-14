// MBet-Adera App Authentication Reset Tool
// This clears any cached authentication in the app
// Run it after running the SQL fixes

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// List of possible auth token storage locations
const possibleStorageLocations = [
  '.expo',                                // Expo cache directory
  'node_modules/.cache',                  // Node modules cache
  'node_modules/@react-native-async-storage', // AsyncStorage cache location
  path.join(require('os').homedir(), '.supabase/auth'), // Possible Supabase auth cache
];

// Files that might contain authentication tokens or state
const possibleAuthFiles = [
  'auth-state.json',
  'storage.json',
  'tokens.json',
  'credentials.json',
  'session.json',
  'auth-session.json',
  '.last-token',
  '.auth-token',
];

async function clearAuthState() {
  console.log('Clearing any cached authentication state...');
  
  // Clear AsyncStorage in app code
  const asyncStoragePath = path.join(process.cwd(), 'src', 'services', 'asyncStorage.js');
  
  try {
    if (fs.existsSync(asyncStoragePath)) {
      await writeFile(
        asyncStoragePath,
        `// Auto-generated AsyncStorage clear\n
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all auth-related AsyncStorage on app start
const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('supabase.auth.token');
    await AsyncStorage.removeItem('sb-jaqwviuxhxsxypmffece-auth-token');
    console.log('Auth state cleared successfully');
  } catch (e) {
    console.error('Error clearing auth state:', e);
  }
};

export { clearAuthState };
`
      );
      console.log('Created AsyncStorage clear script at', asyncStoragePath);
    }
  } catch (error) {
    console.error('Failed to update AsyncStorage helper:', error.message);
  }
  
  // Update App.js to use the clearing function
  const appJsPath = path.join(process.cwd(), 'App.js');
  
  try {
    if (fs.existsSync(appJsPath)) {
      const appJsContent = await readFile(appJsPath, 'utf8');
      
      if (!appJsContent.includes('clearAuthState')) {
        // Simple regex-based modification to add the auth clearing
        let updatedContent = appJsContent;
        
        if (appJsContent.includes('export default function App(')) {
          updatedContent = appJsContent.replace(
            'export default function App(',
            `import { clearAuthState } from './src/services/asyncStorage';\n\nexport default function App(`
          );
          
          // Find first useEffect or similar location to add the clearing
          if (updatedContent.includes('useEffect(')) {
            updatedContent = updatedContent.replace(
              'useEffect(',
              `useEffect(() => {\n    // Clear any cached auth on app start\n    clearAuthState();\n  }, []);\n\n  useEffect(`
            );
          }
          
          await writeFile(appJsPath, updatedContent);
          console.log('Updated App.js to clear auth state on startup');
        }
      }
    }
  } catch (error) {
    console.error('Failed to update App.js:', error.message);
  }
  
  // Search for and delete any auth token files
  for (const dir of possibleStorageLocations) {
    const fullDir = path.resolve(process.cwd(), dir);
    
    try {
      if (fs.existsSync(fullDir)) {
        console.log(`Searching in ${fullDir}...`);
        
        const files = fs.readdirSync(fullDir);
        
        for (const file of files) {
          if (possibleAuthFiles.includes(file) || file.includes('auth') || file.includes('token')) {
            const fullPath = path.join(fullDir, file);
            console.log(`Found potential auth file: ${fullPath}`);
            
            try {
              // Be safe - only remove files that look like JSON auth tokens 
              const content = await readFile(fullPath, 'utf8');
              if (content.includes('token') || content.includes('auth') || content.includes('supabase')) {
                fs.unlinkSync(fullPath);
                console.log(`Removed auth file: ${fullPath}`);
              }
            } catch (e) {
              console.log(`Could not process file ${fullPath}:`, e.message);
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error processing directory ${fullDir}:`, error.message);
    }
  }
  
  console.log('\n=== AUTH RESET COMPLETE ===');
  console.log('1. Run the SQL script in Supabase Dashboard');
  console.log('2. Restart your development server');
  console.log('3. Clear app data on device/emulator');
  console.log('4. Try logging in with any user (password: MBet@2023)');
  console.log('=============================');
}

clearAuthState().catch(console.error); 