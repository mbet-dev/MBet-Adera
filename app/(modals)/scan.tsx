import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import QRCodeScanner from '../../components/QRCodeScanner';
import { diagnoseScannerModules } from '../../utils/debugUtils';
import { MaterialIcons } from '@expo/vector-icons';

export default function ScanModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { navigateOnScan } = params;
  
  const [diagnosticsRun, setDiagnosticsRun] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    status: 'ok' | 'warning' | 'error';
    message: string;
  } | null>(null);
  
  // Run diagnostics on first mount
  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        console.log('[ScanModal] Running scanner diagnostics...');
        const result = await diagnoseScannerModules();
        setDiagnosticResult({
          status: result.status,
          message: result.message
        });
        
        console.log('[ScanModal] Diagnostics result:', result);
        
        // Show alert only for errors
        if (result.status === 'error') {
          Alert.alert(
            'Scanner Issue Detected',
            `${result.message}. This may prevent QR scanning from working properly.`,
            [{ text: 'OK' }]
          );
        }
        
        setDiagnosticsRun(true);
      } catch (error) {
        console.error('[ScanModal] Error running diagnostics:', error);
        setDiagnosticResult({
          status: 'error',
          message: 'Failed to run diagnostics'
        });
        setDiagnosticsRun(true);
      }
    };
    
    runDiagnostics();
  }, []);
  
  // Handle scan close
  const handleClose = () => {
    router.back();
  };
  
  // Handle successful scan
  const handleScan = (data: string) => {
    // You could handle the scan data here if needed
    console.log('[ScanModal] Scanned data:', data);
    
    // If not set to navigate automatically, just close the modal
    if (navigateOnScan !== 'true') {
      setTimeout(() => {
        router.back();
      }, 1500); // Give time to show success message
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Scan QR Code',
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      
      {diagnosticResult?.status === 'error' ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#F44336" />
          <Text style={styles.errorTitle}>Scanner Unavailable</Text>
          <Text style={styles.errorMessage}>{diagnosticResult.message}</Text>
          <Text style={styles.errorDetails}>
            {diagnosticResult.message.includes('module') ? 
              "The scanner requires a development build to function properly. This is because QR scanning needs direct access to your device's camera, which isn't available in Expo Go." : 
              "The scanner module could not be initialized. This may be due to missing permissions, or an issue with the device."}
          </Text>
          
          {diagnosticResult.message.includes('module') && (
            <TouchableOpacity 
              style={styles.devBuildButton}
              onPress={() => Linking.openURL('https://docs.expo.dev/develop/development-builds/create-a-build/')}
            >
              <Text style={styles.devBuildButtonText}>Learn About Development Builds</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <QRCodeScanner
          navigateOnScan={navigateOnScan === 'true'}
          showInstructions={true}
          allowContinue={true}
          onClose={handleClose}
          onScan={handleScan}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 30,
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#555',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devBuildButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 10,
  },
  devBuildButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 