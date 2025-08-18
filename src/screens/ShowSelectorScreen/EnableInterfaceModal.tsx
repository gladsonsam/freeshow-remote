import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { ShowOption } from '../../types';
import { configService } from '../../config/AppConfig';

interface EnableInterfaceModalProps {
  visible: boolean;
  show: ShowOption | null;
  onClose: () => void;
  onSave: (port: string) => void;
  onCancel: () => void;
}

const EnableInterfaceModal: React.FC<EnableInterfaceModalProps> = ({
  visible,
  show,
  onClose,
  onSave,
  onCancel,
}) => {
  const defaultPorts = configService.getDefaultShowPorts();
  
  const [port, setPort] = useState(
    show?.id === 'api' ? String(defaultPorts.api) : 
    show?.id === 'remote' ? String(defaultPorts.remote) : 
    show?.id === 'stage' ? String(defaultPorts.stage) : 
    show?.id === 'control' ? String(defaultPorts.control) : 
    show?.id === 'output' ? String(defaultPorts.output) : ''
  );

  // Reset port when modal is opened/closed or show changes
  React.useEffect(() => {
    setPort(
      show?.id === 'api' ? String(defaultPorts.api) : 
      show?.id === 'remote' ? String(defaultPorts.remote) : 
      show?.id === 'stage' ? String(defaultPorts.stage) : 
      show?.id === 'control' ? String(defaultPorts.control) : 
      show?.id === 'output' ? String(defaultPorts.output) : ''
    );
  }, [show, visible, defaultPorts]);

  const handleSave = () => {
    onSave(port);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.enableBackdrop}>
        <TouchableOpacity style={styles.enableBackdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.enablePopupContainer}>
          <View style={styles.enableHandle} />
          
          {/* Header with icon and title */}
          <View style={styles.enableHeader}>
            <View style={[styles.enableIconContainer, { backgroundColor: (show?.color || '#333') + '15' }]}>
              <Ionicons
                name={(show?.icon as any) || 'apps'}
                size={28}
                color={show?.color || '#333'}
              />
            </View>
            <View style={styles.enableTitleContainer}>
              <Text style={styles.enableTitle}>Enable {show?.title}</Text>
              <Text style={styles.enableSubtitle}>Enter port number to enable this interface</Text>
            </View>
          </View>

          {/* Port Input */}
          <View style={styles.portInputContainer}>
            <Text style={styles.portInputLabel}>Port Number</Text>
            <TextInput
              style={styles.portInput}
              value={port}
              onChangeText={setPort}
              placeholder="Enter port number"
              placeholderTextColor={FreeShowTheme.colors.textSecondary}
              keyboardType="numeric"
              maxLength={5}
              autoFocus={true}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.enableActions}>
            <TouchableOpacity 
              style={[styles.enableActionButton, styles.enableCancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={[styles.enableActionButtonText, styles.enableCancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.enableActionButton, styles.enableSaveButton]}
              onPress={handleSave}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Text style={styles.enableActionButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Enable interface modal styles
  enableBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  enableBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  enablePopupContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 24,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 24,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  enableHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: FreeShowTheme.colors.text + '30',
    alignSelf: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  enableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  enableIconContainer: {
    width: 52,
    height: 52,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  enableTitleContainer: {
    flex: 1,
  },
  enableTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  enableSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  portInputContainer: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  portInputLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  portInput: {
    height: 48,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
  },
  enableActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  enableActionButton: {
    flex: 1,
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  enableSaveButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  enableCancelButton: {
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '20',
    shadowOpacity: 0,
    elevation: 0,
  },
  enableActionButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
  },
  enableCancelButtonText: {
    color: FreeShowTheme.colors.text + 'DD',
  },
});

export default EnableInterfaceModal;