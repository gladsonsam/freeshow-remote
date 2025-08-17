import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { WebView } from 'react-native-webview';

interface PreviewModalProps {
  visible: boolean;
  url: string;
  title: string;
  description?: string;
  onClose: () => void;
  onOpenFullView: () => void;
  onOpenInBrowser: (url: string) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  visible,
  url,
  title,
  description,
  onClose,
  onOpenFullView,
  onOpenInBrowser,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.previewBackdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={styles.previewCard}>
          <View style={styles.previewHandle} />
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.previewClose} accessibilityRole="button">
              <Ionicons name="close" size={22} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.previewTopRow}>
            <Text style={styles.previewUrl} numberOfLines={1}>{url}</Text>
            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.openFullButton} onPress={onOpenFullView} accessibilityRole="button">
                <Text style={styles.openFullButtonText}>Open Full View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.openBrowserButton} onPress={() => onOpenInBrowser(url)} accessibilityRole="button">
                <Ionicons name="globe-outline" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          {description ? (
            <Text style={styles.previewDescription} numberOfLines={2}>{description}</Text>
          ) : null}
          <View style={styles.previewWebview}>
            <WebView
              source={{ uri: url }}
              startInLoadingState
              renderLoading={() => (
                <ActivityIndicator 
                  size="large" 
                  color={FreeShowTheme.colors.secondary} 
                  style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 }} 
                />
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Preview modal styles
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
  },
  previewCard: {
    height: '50%',
    backgroundColor: FreeShowTheme.colors.primary,
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 24,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 24,
    overflow: 'hidden',
  },
  previewHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF33',
    alignSelf: 'center',
    marginVertical: FreeShowTheme.spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.sm,
  },
  previewTitle: {
    color: FreeShowTheme.colors.text,
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewClose: {
    padding: FreeShowTheme.spacing.sm,
  },
  previewUrl: {
    color: FreeShowTheme.colors.text + 'AA',
    flex: 1,
    marginRight: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.xs,
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewDescription: {
    color: FreeShowTheme.colors.text + 'BB',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  openFullButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
  },
  openBrowserButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    padding: FreeShowTheme.spacing.xs,
    borderRadius: FreeShowTheme.borderRadius.md,
  },
  openFullButtonText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewWebview: {
    flex: 1,
    margin: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});

export default PreviewModal;