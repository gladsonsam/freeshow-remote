import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ValidationService } from '../services/InputValidationService';
import { ErrorLogger } from '../services/ErrorLogger';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (ip: string) => void;
}

// Get screen dimensions and determine if device is a tablet
const { width, height } = Dimensions.get('window');
const isTablet = Math.min(width, height) > 600;

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [dimensions, setDimensions] = useState({ width, height, isTablet });

  // Update dimensions when orientation changes
  useEffect(() => {
    const updateDimensions = () => {
      const { width: newWidth, height: newHeight } = Dimensions.get('window');
      const newIsTablet = Math.min(newWidth, newHeight) > 600;
      setDimensions({ width: newWidth, height: newHeight, isTablet: newIsTablet });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    if (visible) {
      setScanned(false);
      setTorchEnabled(false);
    }
  }, [visible, permission?.granted, requestPermission]);

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      ErrorLogger.debug('QR code scanned', 'QRScannerModal', new Error(`Type: ${type}, Data: ${data}`));
      
      // Validate QR content first
      const qrValidation = ValidationService.validateQRContent(data);
      if (!qrValidation.isValid) {
        Alert.alert(
          'Invalid QR Code', 
          qrValidation.error || 'The QR code contains invalid content.',
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Use the already validated content from QR validation
      // The QR validation service handles URL parsing and host extraction
      onScan(qrValidation.sanitizedValue as string);
      onClose();
      
    } catch (error) {
      ErrorLogger.error('QR code processing failed', 'QRScannerModal', error instanceof Error ? error : new Error(String(error)));
      Alert.alert(
        'QR Scan Error', 
        'Failed to process the scanned QR code.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={FreeShowTheme.colors.text + '66'} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Please allow camera access to scan QR codes for FreeShow connections.
            </Text>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.torchButton} 
              onPress={() => setTorchEnabled(!torchEnabled)}
            >
              <Ionicons 
                name={torchEnabled ? "flashlight" : "flashlight-outline"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.scanner}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "pdf417", "code128", "code39"],
            }}
            // Optimize performance
            animateShutter={false}
            enableTorch={torchEnabled}
          />
          
          <View style={styles.overlay}>
            <View style={[
              styles.scanFrame, 
              {
                width: dimensions.isTablet 
                  ? Math.min(300, Math.min(dimensions.width, dimensions.height) * 0.5) 
                  : dimensions.width * 0.7,
                height: dimensions.isTablet 
                  ? Math.min(300, Math.min(dimensions.width, dimensions.height) * 0.5) 
                  : dimensions.width * 0.7
              }
            ]} />
            <View style={[
              styles.scanLine,
              {
                width: dimensions.isTablet 
                  ? Math.min(300, Math.min(dimensions.width, dimensions.height) * 0.5) - 4 
                  : dimensions.width * 0.7 - 4
              }
            ]} />
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Point your camera at the FreeShow QR code to scan and connect automatically
          </Text>
          {scanned && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setScanned(false)}
            >
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingTop: 60, // Account for status bar
    backgroundColor: FreeShowTheme.colors.primaryDarker,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: FreeShowTheme.fonts.system,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  torchButton: {
    padding: FreeShowTheme.spacing.sm,
    marginRight: FreeShowTheme.spacing.xs,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary,
    backgroundColor: 'transparent',
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  scanLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: FreeShowTheme.colors.secondary,
    top: '50%',
    marginTop: -1,
  },
  instructions: {
    padding: FreeShowTheme.spacing.xl,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: 'white',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
    fontFamily: FreeShowTheme.fonts.system,
  },
  text: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
    fontFamily: FreeShowTheme.fonts.system,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  permissionTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.md,
    textAlign: 'center',
    fontFamily: FreeShowTheme.fonts.system,
  },
  permissionText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
  },
  button: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default QRScannerModal;
