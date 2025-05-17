import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  StatusBar as RNStatusBar, 
  Platform, 
  BackHandler,
  Dimensions,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { extractTrackingCode } from '../utils/qrCodeUtils'; // getQRScannerErrorMessage might be less relevant with direct Camera errors
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Camera, CameraType, FlashMode as ExpoFlashMode } from 'expo-camera'; // Using expo-camera
import type { CameraCapturedPicture, CameraMountError, BarcodeScanningResult } from 'expo-camera';

// Safely import haptics (camera is imported directly)
let Haptics: any;

// Track if modules are available
let cameraAvailable = true; // Assume true initially, verify in useEffect for web/Expo Go
let hapticsAvailable = false;

try {
  console.log('[QRScanner] Attempting to import expo-haptics');
  Haptics = require('expo-haptics');
  console.log('[QRScanner] Successfully imported Haptics:', !!Haptics);
  hapticsAvailable = true;
} catch (err) {
  console.log('[QRScanner] Haptics not available');
  Haptics = undefined;
  hapticsAvailable = false;
}

type QRCodeScannerProps = {
  onScan?: (data: string) => void;
  navigateOnScan?: boolean;
  showInstructions?: boolean;
  allowContinue?: boolean;
  onClose?: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define FlashMode string literal type for clarity, if not using SDK's exported enum value
type FlashMode = 'on' | 'off' | 'auto' | 'torch';

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  navigateOnScan = false,
  showInstructions = true,
  allowContinue = true,
  onClose
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanData, setScanData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMode>('off'); // Use string literal
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (onClose) {
          onClose();
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [onClose]);

  useEffect(() => {
    console.log('[QRScanner] Component mounted, using expo-camera');
    if (Platform.OS === 'web') {
      // For web, camera for QR scanning is generally not supported via expo-camera in a way that works out of the box for all browsers.
      // It often requires a specific library like html5-qrcode or similar, and permissions can be tricky.
      // We will treat it as unavailable for simplicity in this component.
      console.warn('[QRScanner] Camera for QR scanning on web has limited support and is treated as unavailable here.');
      setError('QR code scanning via camera is not supported on web in this app version.');
      setLoading(false);
      cameraAvailable = false;
      return;
    } 
    if (Constants.executionEnvironment === 'storeClient') {
      // In Expo Go, some native capabilities might be restricted.
      console.warn('[QRScanner] Running in Expo Go, camera features might be limited.');
      // We will proceed but be mindful that it might not work perfectly for all Expo Go versions/devices.
    }

    (async () => {
      try {
        // Check if Camera and its essential methods are available, indicates module loaded
        if (!Camera || typeof Camera.requestCameraPermissionsAsync !== 'function') {
          console.error('[QRScanner] Camera module or requestCameraPermissionsAsync is not available.');
          throw new Error('Camera module failed to load. QR scanning is unavailable.');
        }
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          setError('Camera permission is required to scan QR codes. Please enable it in settings.');
        }
      } catch (err: any) {
        console.error('[QRScanner] Error initializing camera or requesting permissions:', err);
        setError(`Failed to initialize or access camera: ${err.message || 'Unknown error'}`);
        cameraAvailable = false; // If permission request itself fails, or module load fails, consider camera unavailable
      }
      setLoading(false);
    })();
  }, []);

  const handleBarCodeScanned = (params: BarcodeScanningResult) => {
    const { data, type } = params; // type can be used if needed, e.g. logging params.type
    if (scanned || Platform.OS === 'web') return; // Do not process if web (already handled by error message) 
    setScanned(true);
    setScanData(data);
    if (hapticsAvailable && Haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      const trackingCode = extractTrackingCode(data);
      if (trackingCode && navigateOnScan) {
        if (onScan) onScan(trackingCode);
        setTimeout(() => router.push(`/delivery/${trackingCode}`), 1500);
      } else if (onScan) {
        onScan(data);
      }
    } catch (err: any) {
      console.error('[QRScanner] Error processing scan data:', err);
      setError(`Could not process QR code data: ${err.message || 'Please try again.'}`);
      setScanned(false);
    }
  };

  const handleRescan = () => {
    setScanned(false);
    setScanData(null);
    setError(null);
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const toggleFlash = () => {
    if (Platform.OS === 'web') return;
    setFlash((current) => (current === 'off' ? 'torch' : 'off')); // Use string literals
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.infoText}>Initializing camera...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <MaterialIcons name="error-outline" size={60} color="#FF5252" />
        <Text style={styles.errorTitle}>Scanner Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        {(error.includes('Expo Go') || (Platform.OS !== 'web' && Constants.executionEnvironment === 'storeClient')) && (
          <View style={styles.expoBuildInfo}>
            <Text style={styles.expoBuildText}>
              Native camera features require a development build or standalone app.
            </Text>
            <Text style={[styles.expoBuildText, { marginTop: 8 }]}>
              This is a limitation of Expo Go, not an issue with the app itself.
            </Text>
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={() => Linking.openURL('https://docs.expo.dev/develop/development-builds/create-a-build/')}
            >
              <Text style={styles.learnMoreButtonText}>Learn About Development Builds</Text>
            </TouchableOpacity>
          </View>
        )}
        {error.includes('permission') && Platform.OS === 'ios' && (
           <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Linking.openURL('app-settings:')}
          >
            <Text style={styles.actionButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        {allowContinue && (
          <TouchableOpacity 
            style={[styles.actionButton, { marginTop: error.includes('permission') && Platform.OS === 'ios' ? 10 : 0 }]} 
            onPress={handleClose}
          >
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (Platform.OS !== 'web' && hasPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.infoText}>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (Platform.OS !== 'web' && hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <MaterialIcons name="no-photography" size={60} color="#FF5252" />
        <Text style={styles.errorTitle}>No Camera Access</Text>
        <Text style={styles.errorText}>
          Camera permission is required to scan QR codes. Please enable camera access in your device settings.
        </Text>
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Linking.openURL('app-settings:')}
          >
            <Text style={styles.actionButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        {allowContinue && (
          <TouchableOpacity 
            style={[styles.actionButton, { marginTop: 10 }]} 
            onPress={handleClose}
          >
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {Platform.OS !== 'web' && cameraAvailable && hasPermission === true ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.scanner}
            type={'back'} // Use string literal for CameraType
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            flashMode={flash} // flash state is already string literal 'on' | 'off' etc.
            autoFocus={true} // Use boolean for autoFocus
            barCodeScannerSettings={{
              barCodeTypes: ['qr'], // Use string literal for BarCodeType
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.topOverlay}>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
                  <Ionicons 
                    name={flash === 'torch' ? "flash" : "flash-off"} // Compare with string literal
                    size={28} 
                    color="white" 
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.scanFrame}>
              {!scanned && (
                <View style={styles.scannerCorners}>
                  <View style={[styles.corner, styles.topLeftCorner]} />
                  <View style={[styles.corner, styles.topRightCorner]} />
                  <View style={[styles.corner, styles.bottomLeftCorner]} />
                  <View style={[styles.corner, styles.bottomRightCorner]} />
                </View>
              )}
            </View>
            <View style={styles.bottomOverlay}>
              {scanned ? (
                <View style={styles.resultContainer}>
                  {scanData && (
                    <>
                      <View style={styles.successIcon}>
                        <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
                      </View>
                      <Text style={styles.successText}>QR Code Scanned!</Text>
                      <Text style={styles.dataText} numberOfLines={2}>
                        {scanData.length > 40 ? `${scanData.substring(0, 40)}...` : scanData}
                      </Text>
                      <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={handleRescan}
                      >
                        <Text style={styles.actionButtonText}>Scan Again</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : (
                showInstructions && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                      Position the QR code within the frame to scan
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#FF5252" />
          <Text style={styles.errorTitle}>Camera Not Available</Text>
          <Text style={styles.errorText}>
            {Platform.OS === 'web' ? 
              "QR code scanning via camera is not supported on this web browser or device." : 
              "Camera is not available or permission was denied. Please check settings."}
          </Text>
          {allowContinue && (
            <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanner: {
    ...StyleSheet.absoluteFillObject, // Ensures camera fills the container
  },
  overlay: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // Overlay should be transparent by default
  },
  topOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: RNStatusBar.currentHeight || Constants.statusBarHeight || 40,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed border: '2px solid white', use corners instead for better visuals
  },
  scannerCorners: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30, // Increased size for better visibility
    height: 30, // Increased size for better visibility
    borderColor: 'rgba(255, 255, 255, 0.8)', // Slightly transparent white
    borderWidth: 4, // Thicker border
  },
  topLeftCorner: {
    top: -2, // Offset to align with border center
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
  },
  topRightCorner: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 5,
  },
  bottomLeftCorner: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 5,
  },
  bottomRightCorner: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 5,
  },
  bottomOverlay: {
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12, // Adjusted padding
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.8, // Slightly wider result box
    alignSelf: 'center',
  },
  successIcon: {
    marginBottom: 10,
  },
  successText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dataText: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 150, // Ensure buttons have a decent width
    alignItems: 'center', // Center text in button
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center', // Center info text
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  expoBuildInfo: {
    backgroundColor: '#212121',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  expoBuildText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  learnMoreButton: {
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 8,
  },
  learnMoreButtonText: {
    color: 'white',
    fontSize: 14,
  },
});

export default QRCodeScanner; 