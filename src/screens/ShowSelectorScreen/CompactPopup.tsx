import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, PanResponder } from 'react-native';
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
  // Animation values
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Check if interface is disabled
  const isDisabled = show && (!show.port || show.port === 0);

  // Handle modal visibility changes with animation
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  // PanResponder for swipe-to-close functionality
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        // Start tracking the gesture
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward movement (positive dy values)
        if (gestureState.dy > 0) {
          // Calculate the new position based on swipe distance
          const newPosition = Math.max(0, 1 - gestureState.dy / 200);
          slideAnim.setValue(newPosition);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped down more than 100px, close the popup
        if (gestureState.dy > 100) {
          onClose();
        } else {
          // Otherwise, animate back to original position
          Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is terminated, animate back to original position
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }).start();
      },
    })
  );
  
  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.compactBackdrop}>
        <Animated.View
          style={[
            styles.compactBackdropTouchable,
            { opacity: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.compactPopupContainer,
            { transform: [{ translateY: modalTranslateY }] }
          ]}
          {...panResponder.current.panHandlers}
        >
          <View style={styles.compactHandle} />

          {/* Enhanced Header with better visual hierarchy */}
          <View style={[styles.compactHeader, { backgroundColor: (show?.color || '#333') + '15' }]}>
            <View style={styles.compactIconWrapper}>
              <View style={[styles.compactIconContainer, { backgroundColor: (show?.color || '#333') + '20' }]}>
                <Ionicons
                  name={(show?.icon as any) || 'apps'}
                  size={32}
                  color={show?.color || '#333'}
                />
              </View>
              {isDisabled && <View style={styles.disabledOverlay} />}
            </View>
            <View style={styles.compactTitleContainer}>
              <Text style={styles.compactTitle}>{show?.title}</Text>
              <Text style={styles.compactSubtitle}>{show?.description}</Text>
              {isDisabled && <Text style={styles.disabledText}>Interface disabled</Text>}
            </View>
            {/* Status indicators */}
            {!isDisabled && !!(show?.port) && (
              <View style={styles.simpleStatusDot} />
            )}
            {isDisabled && (
              <View style={styles.disabledStatusDot} />
            )}
          </View>

          {/* Enhanced IP Address section */}
          {!isDisabled && !!(show?.port) && (
            <View style={styles.compactIpContainer}>
              <View style={styles.compactIpRow}>
                <View style={styles.compactIpTextContainer}>
                  <Text style={styles.compactIpLabel}>Connection URL</Text>
                  <Text style={styles.compactIpText}>
                    {connectionHost}:{show?.port}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.compactClipboardButton}
                onPress={() => show && onCopyToClipboard(show)}
                accessibilityRole="button"
                accessibilityLabel="Copy URL to clipboard"
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={20} color={FreeShowTheme.colors.text + 'CC'} />
                <Text style={styles.compactClipboardText}>Copy</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modernized Action buttons with better design */}
          <View style={styles.compactActions}>
            {isDisabled ? (
              // Enhanced enable button for disabled interfaces
              <TouchableOpacity
                style={[styles.compactActionButton, styles.compactEnableButton]}
                onPress={() => {
                  if (show && onEnableInterface) {
                    onClose();
                    onEnableInterface(show);
                  }
                }}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <View style={styles.compactButtonContent}>
                  <View style={styles.compactButtonIconContainer}>
                    <Ionicons name="add-circle" size={24} color="white" />
                  </View>
                  <View style={styles.compactButtonTextContainer}>
                    <Text style={styles.compactActionButtonText}>Enable Interface</Text>
                    <Text style={styles.compactActionButtonSubtext}>Start this interface</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              // Enhanced regular actions for enabled interfaces
              <>
                <TouchableOpacity
                  style={[styles.compactActionButton, styles.compactPrimaryButton]}
                  onPress={() => {
                    if (show) {
                      onClose();
                      onOpenShow(show);
                    }
                  }}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <View style={styles.compactButtonContent}>
                    <View style={styles.compactButtonIconContainer}>
                      <Ionicons name="play-circle" size={24} color="white" />
                    </View>
                    <View style={styles.compactButtonTextContainer}>
                      <Text style={styles.compactActionButtonText}>Open Interface</Text>
                      <Text style={styles.compactActionButtonSubtext}>Launch this interface</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {show?.id !== 'api' && (
                  <TouchableOpacity
                    style={[styles.compactActionButton, styles.compactSecondaryButton]}
                    onPress={() => show && onOpenInBrowser(show)}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <View style={styles.compactButtonContent}>
                      <View style={styles.compactButtonIconContainer}>
                        <Ionicons name="globe-outline" size={24} color={FreeShowTheme.colors.text + 'DD'} />
                      </View>
                      <View style={styles.compactButtonTextContainer}>
                        <Text style={styles.compactSecondaryButtonText}>Open in Browser</Text>
                        <Text style={styles.compactSecondaryButtonSubtext}>External browser</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {/* Enhanced disable button for enabled interfaces */}
                {onDisableInterface && (
                  <TouchableOpacity
                    style={[styles.compactActionButton, styles.compactSecondaryButton]}
                    onPress={() => {
                      if (show && onDisableInterface) {
                        onClose();
                        onDisableInterface(show);
                      }
                    }}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                  >
                    <View style={styles.compactButtonContent}>
                      <View style={styles.compactButtonIconContainer}>
                        <Ionicons name="close-circle-outline" size={24} color={FreeShowTheme.colors.text + 'DD'} />
                      </View>
                      <View style={styles.compactButtonTextContainer}>
                        <Text style={styles.compactSecondaryButtonText}>Disable Interface</Text>
                        <Text style={styles.compactSecondaryButtonSubtext}>Stop this interface</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Enhanced Compact popup styles
  compactBackdrop: {
    flex: 1,
    backgroundColor: '#00000080',
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
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 28,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 28,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xl + 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    minHeight: 300,
  },
  compactHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: FreeShowTheme.colors.text + '25',
    alignSelf: 'center',
    marginTop: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.xl,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginHorizontal: 0,
  },
  compactIconWrapper: {
    position: 'relative',
    marginRight: FreeShowTheme.spacing.lg,
  },
  compactIconContainer: {
    width: 60,
    height: 60,
    borderRadius: FreeShowTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000040',
    borderRadius: FreeShowTheme.borderRadius.xl,
  },
  compactTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: FreeShowTheme.fontSize.xl + 2,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 4,
    lineHeight: 28,
  },
  compactSubtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: '#ffffffDD',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
    lineHeight: 20,
  },
  disabledText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: '#ffffff',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
    marginTop: 4,
  },
  simpleStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC40',
    marginTop: FreeShowTheme.spacing.sm,
    alignSelf: 'center',
  },
  disabledStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginTop: FreeShowTheme.spacing.sm,
    alignSelf: 'center',
  },
  compactIpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    backgroundColor: FreeShowTheme.colors.text + '06',
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '12',
  },
  compactIpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  compactStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    backgroundColor: '#2ECC4020',
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#2ECC4040',
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC40',
    marginRight: FreeShowTheme.spacing.xs,
  },
  compactStatusText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: '#2ECC40',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactIpTextContainer: {
    flex: 1,
  },
  compactIpLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '80',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  compactIpText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + 'DD',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    lineHeight: 22,
  },
  compactClipboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.secondary,
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  compactClipboardText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: 'white',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    marginLeft: FreeShowTheme.spacing.xs,
  },
  compactActions: {
    flexDirection: 'column',
    gap: FreeShowTheme.spacing.md,
  },
  compactActionButton: {
    width: '100%',
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  compactButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  compactButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  compactButtonTextContainer: {
    flex: 1,
  },
  compactPrimaryButton: {
    backgroundColor: '#1F7A1F', // More muted green that doesn't stand out too much
  },
  compactEnableButton: {
    backgroundColor: '#1F7A1F', // Same muted green for consistency
  },
  compactSecondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '20',
    shadowOpacity: 0,
    elevation: 0,
  },
  compactActionButtonText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
    marginBottom: 2,
  },
  compactActionButtonSubtext: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '500',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  compactSecondaryButtonText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    color: FreeShowTheme.colors.text + 'DD',
    marginBottom: 2,
  },
  compactSecondaryButtonSubtext: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '500',
    fontFamily: FreeShowTheme.fonts.system,
    color: FreeShowTheme.colors.text + '80',
  },
});

export default CompactPopup;