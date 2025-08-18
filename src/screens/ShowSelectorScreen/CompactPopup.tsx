import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { ShowOption } from '../../types';

interface CompactPopupProps {
  visible: boolean;
  show: ShowOption | null;
  connectionHost: string | null;
  onClose: () => void;
  onCopyToClipboard: (show: ShowOption) => void;
  onOpenInBrowser: (show: ShowOption) => void;
  onOpenShow: (show: ShowOption) => void;
  onEnableInterface?: (show: ShowOption) => void;
  onDisableInterface?: (show: ShowOption) => void;
}

const CompactPopup: React.FC<CompactPopupProps> = ({
  visible,
  show,
  connectionHost,
  onClose,
  onCopyToClipboard,
  onOpenInBrowser,
  onOpenShow,
  onEnableInterface,
  onDisableInterface,
}) => {
  // Check if interface is disabled
  const isDisabled = show && (!show.port || show.port === 0);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.compactBackdrop}>
        <TouchableOpacity style={styles.compactBackdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.compactPopupContainer}>
          <View style={styles.compactHandle} />
          
          {/* Header with icon and title */}
          <View style={styles.compactHeader}>
            <View style={[styles.compactIconContainer, { backgroundColor: (show?.color || '#333') + '15' }]}>
              <Ionicons
                name={(show?.icon as any) || 'apps'}
                size={28}
                color={show?.color || '#333'}
              />
            </View>
            <View style={styles.compactTitleContainer}>
              <Text style={styles.compactTitle}>{show?.title}</Text>
              <Text style={styles.compactSubtitle}>{show?.description}</Text>
            </View>
          </View>

          {/* IP Address with status dot - only show for enabled interfaces */}
          {!isDisabled && show?.port && (
            <View style={styles.compactIpContainer}>
              <View style={styles.compactIpRow}>
                <View style={styles.compactStatusDot} />
                <Text style={styles.compactIpText}>
                  {connectionHost}:{show?.port}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.compactClipboardButton}
                onPress={() => show && onCopyToClipboard(show)}
                accessibilityRole="button"
                accessibilityLabel="Copy URL to clipboard"
                activeOpacity={0.6}
              >
                <Ionicons name="copy-outline" size={18} color={FreeShowTheme.colors.text + 'BB'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.compactActions}>
            {isDisabled ? (
              // Show enable button for disabled interfaces
              <TouchableOpacity 
                style={[styles.compactActionButton, styles.compactOpenButton]}
                onPress={() => {
                  if (show && onEnableInterface) {
                    onClose();
                    onEnableInterface(show);
                  }
                }}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="white" style={styles.compactButtonIcon} />
                <Text style={styles.compactActionButtonText}>Enable</Text>
              </TouchableOpacity>
            ) : (
              // Show regular actions for enabled interfaces
              <>
                <TouchableOpacity 
                  style={[styles.compactActionButton, styles.compactOpenButton]}
                  onPress={() => {
                    if (show) {
                      onClose();
                      onOpenShow(show);
                    }
                  }}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle" size={20} color="white" style={styles.compactButtonIcon} />
                  <Text style={styles.compactActionButtonText}>Open</Text>
                </TouchableOpacity>
                {show?.id !== 'api' && (
                  <TouchableOpacity 
                    style={[styles.compactActionButton, styles.compactBrowserButton]}
                    onPress={() => show && onOpenInBrowser(show)}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.text + 'CC'} style={styles.compactButtonIcon} />
                    <Text style={[styles.compactActionButtonText, styles.compactBrowserButtonText]}>Open in Browser</Text>
                  </TouchableOpacity>
                )}
                {/* Add disable button for enabled interfaces */}
                {onDisableInterface && (
                  <TouchableOpacity 
                    style={[styles.compactActionButton, styles.compactBrowserButton]}
                    onPress={() => {
                      if (show && onDisableInterface) {
                        onClose();
                        onDisableInterface(show);
                      }
                    }}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={FreeShowTheme.colors.text + 'CC'} style={styles.compactButtonIcon} />
                    <Text style={[styles.compactActionButtonText, styles.compactBrowserButtonText]}>Disable</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Compact popup styles
  compactBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  compactBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compactPopupContainer: {
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
  compactHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: FreeShowTheme.colors.text + '30',
    alignSelf: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  compactIconContainer: {
    width: 52,
    height: 52,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  compactTitleContainer: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  compactIpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '10',
  },
  compactIpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC40',
    marginRight: FreeShowTheme.spacing.sm,
  },
  compactIpText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    flex: 1,
  },
  compactClipboardButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.sm,
    backgroundColor: FreeShowTheme.colors.text + '08',
  },
  compactActions: {
    flexDirection: 'column',
    gap: FreeShowTheme.spacing.sm,
  },
  compactActionButton: {
    width: '100%',
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
  compactButtonIcon: {
    marginRight: FreeShowTheme.spacing.sm,
  },
  compactOpenButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  compactBrowserButton: {
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '20',
    shadowOpacity: 0,
    elevation: 0,
  },
  compactActionButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
  },
  compactBrowserButtonText: {
    color: FreeShowTheme.colors.text + 'DD',
  },
});

export default CompactPopup;