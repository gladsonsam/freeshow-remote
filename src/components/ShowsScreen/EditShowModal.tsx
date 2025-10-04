import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface EditShowModalProps {
  visible: boolean;
  onClose: () => void;
  showDetails: any;
  onSave: (showId: string, plainText: string) => Promise<boolean>;
}

export const EditShowModal: React.FC<EditShowModalProps> = ({
  visible,
  onClose,
  showDetails,
  onSave,
}) => {
  const [plainText, setPlainText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && showDetails) {
      // Convert the show details to plain text format
      const text = convertShowToPlainText(showDetails);
      setPlainText(text);
      setError(null);
    }
  }, [visible, showDetails]);

  const convertShowToPlainText = (show: any): string => {
    let text = '';
    
    if (show.name) {
      text += `Title: ${show.name}\n\n`;
    }
    
    if (show.meta) {
      if (show.meta.author) text += `Author: ${show.meta.author}\n`;
      if (show.meta.artist) text += `Artist: ${show.meta.artist}\n`;
      if (show.meta.CCLI) text += `CCLI: ${show.meta.CCLI}\n`;
      if (show.meta.copyright) text += `Copyright: ${show.meta.copyright}\n`;
      text += '\n';
    }
    
    if (show.slides) {
      text += 'Lyrics:\n';
      text += '='.repeat(50) + '\n\n';
      
      // Process slides to extract lyrics
      Object.values(show.slides).forEach((slide: any) => {
        if (slide.group) {
          text += `[${slide.group}]\n`;
        }
        
        if (slide.items) {
          slide.items.forEach((item: any) => {
            if (item.lines) {
              item.lines.forEach((line: any) => {
                if (line.text) {
                  const lineText = line.text.map((t: any) => t.value).join('');
                  text += lineText + '\n';
                }
              });
            }
          });
        }
        text += '\n';
      });
    }
    
    return text.trim();
  };

  const handleSave = async () => {
    if (!showDetails?.id || !plainText.trim()) {
      setError('Please enter some content to save');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const success = await onSave(showDetails.id, plainText.trim());
      if (success) {
        onClose();
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalBackButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Show</Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.editContainer}>
            <Text style={styles.instructionsText}>
              Edit the show content below. You can modify the title, metadata, and lyrics.
            </Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.textInput}
              value={plainText}
              onChangeText={setPlainText}
              placeholder="Enter show content..."
              placeholderTextColor={FreeShowTheme.colors.textSecondary + '80'}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  modalBackButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  modalTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.connected,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  saveButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary,
  },
  saveButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  editContainer: {
    flex: 1,
  },
  instructionsText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.lg,
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
    backgroundColor: '#FF6B6B' + '20',
    padding: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: '#FF6B6B',
    flex: 1,
  },
  textInput: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
    minHeight: 400,
  },
});
