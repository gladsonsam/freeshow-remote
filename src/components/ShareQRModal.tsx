import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface ShareQRModalProps {
  visible: boolean;
  onClose: () => void;
  host: string;
  port: string;
}

const { width } = Dimensions.get('window');

const ShareQRModal: React.FC<ShareQRModalProps> = ({ visible, onClose, host, port }) => {
  const connectionUrl = `http://${host}:${port}`;
  const qrSize = width * 0.6;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Connection</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            <QRCode
              value={connectionUrl}
              size={qrSize}
              backgroundColor="white"
              color="black"
            />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.urlText}>{connectionUrl}</Text>
            <Text style={styles.instructionText}>
              Scan this QR code with another device to connect to the same FreeShow server
            </Text>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  modalContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: FreeShowTheme.spacing.xl,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    fontFamily: FreeShowTheme.fonts.system,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.xl,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
  },
  urlText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.md,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  doneButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default ShareQRModal;
