import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings, useConnection } from '../contexts';
import { ConnectionHistory, settingsRepository } from '../repositories';
import ConfirmationModal from '../components/ConfirmationModal';
import { ValidationService } from '../services/InputValidationService';
import { configService } from '../config/AppConfig';
import { ErrorLogger } from '../services/ErrorLogger';

interface ConnectionHistoryScreenProps {
  navigation: any;
}

const ConnectionHistoryScreen: React.FC<ConnectionHistoryScreenProps> = ({ navigation }) => {
  const { history, actions } = useSettings();
  const connection = useConnection();
  const { connect, updateShowPorts } = connection.actions;
  
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionHistory | null>(null);
  const [editNicknameText, setEditNicknameText] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [connectionToRemove, setConnectionToRemove] = useState<string | null>(null);

  const handleRemoveFromHistory = (id: string) => {
    setConnectionToRemove(id);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveFromHistory = async () => {
    if (!connectionToRemove) return;
    
    try {
      await actions.removeFromHistory(connectionToRemove);
      setShowRemoveConfirm(false);
      setConnectionToRemove(null);
    } catch (error) {
      console.error('Failed to remove connection from history:', error);
      // You could add another modal for error display here if needed
    }
  };

  const cancelRemoveFromHistory = () => {
    setShowRemoveConfirm(false);
    setConnectionToRemove(null);
  };

  const handleClearAllHistory = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAllHistory = async () => {
    try {
      await actions.clearHistory();
      setShowClearAllConfirm(false);
    } catch (error) {
      console.error('Failed to clear connection history:', error);
      // You could add another modal for error display here if needed
    }
  };

  const cancelClearAllHistory = () => {
    setShowClearAllConfirm(false);
  };

  const handleEditNickname = (item: ConnectionHistory) => {
    setEditingConnection(item);
    setEditNicknameText(item.nickname || item.host);
    setShowEditNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!editingConnection) return;
    
    try {
      await settingsRepository.updateConnectionNickname(editingConnection.id, editNicknameText);
      await actions.refreshHistory();
      setShowEditNickname(false);
      setEditingConnection(null);
      setEditNicknameText('');
    } catch (error) {
      console.error('Failed to update nickname:', error);
      // You could add an error modal here if needed, for now just log the error
    }
  };

  const handleCancelEdit = () => {
    setShowEditNickname(false);
    setEditingConnection(null);
    setEditNicknameText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Connection History</Text>
          <Text style={styles.subtitle}>
            {history.length} {history.length === 1 ? 'connection' : 'connections'}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAllHistory}
          >
            <Ionicons name="trash-outline" size={20} color={FreeShowTheme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {history.length > 0 ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {history.map((item: ConnectionHistory, _index: number) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.historyItem}
              onPress={async () => {
                try {
                  // Validate host from history
                  const hostValidation = ValidationService.validateHost(item.host);
                  if (!hostValidation.isValid) {
                    ErrorLogger.warn('Invalid host in history item', 'ConnectionHistoryScreen', new Error(hostValidation.error || 'Unknown validation error'));
                    return;
                  }

                  // Update UI with history item data
                  const sanitizedHost = hostValidation.sanitizedValue as string;
                  
                  // Validate and update interface ports from stored history
                  let validatedShowPorts;
                  
                  if (item.showPorts) {
                    const showPortsValidation = ValidationService.validateShowPorts(item.showPorts);
                    if (!showPortsValidation.isValid) {
                      ErrorLogger.warn('History item has invalid show ports, using defaults', 'ConnectionHistoryScreen', 
                        new Error(`Invalid ports: ${JSON.stringify(item.showPorts)}`)
                      );
                      validatedShowPorts = configService.getDefaultShowPorts();
                    } else {
                      validatedShowPorts = showPortsValidation.sanitizedValue;
                    }
                  } else {
                    // Use default ports if none stored
                    validatedShowPorts = configService.getDefaultShowPorts();
                  }
                  
                  ErrorLogger.info('Attempting connection from history with validated inputs', 'ConnectionHistoryScreen', 
                    new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(validatedShowPorts)}`)
                  );

                  const defaultPort = configService.getNetworkConfig().defaultPort;
                  const connected = await connect(sanitizedHost, defaultPort, item.nickname);
                  
                  if (connected) {
                    // Update show ports after successful connection
                    await updateShowPorts(validatedShowPorts);
                    // Navigate to Interface screen using the correct nested navigation
                    navigation.navigate('Main', { screen: 'Interface' });
                  }
                } catch (error) {
                  ErrorLogger.error('History connection failed', 'ConnectionHistoryScreen', error instanceof Error ? error : new Error(String(error)));
                }
              }}
            >
              <View style={styles.historyItemHeader}>
                <View style={styles.historyItemIcon}>
                  <Ionicons name="desktop" size={20} color={FreeShowTheme.colors.secondary} />
                </View>
                <View style={styles.historyItemInfo}>
                  <Text style={styles.historyItemHost}>{item.nickname || item.host}</Text>
                  {item.nickname && item.nickname !== item.host && (
                    <Text style={styles.historyItemIP}>{item.host}</Text>
                  )}
                  <Text style={styles.historyItemTime}>
                    Last used: {new Date(item.lastUsed).toLocaleDateString()} at {new Date(item.lastUsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.historyItemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleEditNickname(item);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveFromHistory(item.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {!!(item.showPorts) && (
                <View style={styles.portsContainer}>
                  <Text style={styles.portsLabel}>Port Configuration:</Text>
                  <View style={styles.portsGrid}>
                    <View style={styles.portItem}>
                      <Text style={styles.portLabel}>Remote</Text>
                      <Text style={styles.portValue}>{item.showPorts.remote}</Text>
                    </View>
                    <View style={styles.portItem}>
                      <Text style={styles.portLabel}>Stage</Text>
                      <Text style={styles.portValue}>{item.showPorts.stage}</Text>
                    </View>
                    <View style={styles.portItem}>
                      <Text style={styles.portLabel}>Control</Text>
                      <Text style={styles.portValue}>{item.showPorts.control}</Text>
                    </View>
                    <View style={styles.portItem}>
                      <Text style={styles.portLabel}>Output</Text>
                      <Text style={styles.portValue}>{item.showPorts.output}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Connection History</Text>
          <Text style={styles.emptySubtitle}>
            Connections you make will appear here for quick access
          </Text>
        </View>
      )}

      {/* Edit Nickname Modal */}
      <Modal
        visible={showEditNickname}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Connection Name</Text>
              <TouchableOpacity
                style={styles.editModalCloseButton}
                onPress={handleCancelEdit}
              >
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editModalBody}>
              <Text style={styles.editModalLabel}>
                Connection: {editingConnection?.host}
              </Text>
              <TextInput
                style={styles.editModalInput}
                value={editNicknameText}
                onChangeText={setEditNicknameText}
                placeholder="Enter connection name"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalCancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.editModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalSaveButton]}
                onPress={handleSaveNickname}
              >
                <Text style={styles.editModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Connection Confirmation Modal */}
      <ConfirmationModal
        visible={showRemoveConfirm}
        title="Remove Connection"
        message="Are you sure you want to remove this connection from history?"
        confirmText="Remove"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="trash-outline"
        onConfirm={confirmRemoveFromHistory}
        onCancel={cancelRemoveFromHistory}
      />

      {/* Clear All History Confirmation Modal */}
      <ConfirmationModal
        visible={showClearAllConfirm}
        title="Clear All History"
        message="Are you sure you want to clear all connection history? This cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="warning-outline"
        onConfirm={confirmClearAllHistory}
        onCancel={cancelClearAllHistory}
      />
    </SafeAreaView>
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
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  backButton: {
    padding: FreeShowTheme.spacing.sm,
    marginRight: FreeShowTheme.spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
  },
  clearAllButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  historyItem: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemHost: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 8,
  },
  historyItemIP: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: 2,
  },
  historyItemTime: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 0,
  },
  historyItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.sm,
    backgroundColor: FreeShowTheme.colors.primary,
    marginRight: FreeShowTheme.spacing.xs,
  },
  deleteButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.sm,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  portsContainer: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  portsLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
    marginTop: FreeShowTheme.spacing.sm,
  },
  portsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.sm,
  },
  portItem: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.sm,
    padding: FreeShowTheme.spacing.sm,
    alignItems: 'center',
  },
  portLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: 2,
  },
  portValue: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: FreeShowTheme.spacing.xl,
  },
  emptyTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    margin: FreeShowTheme.spacing.lg,
    minWidth: 280,
    maxWidth: 400,
    width: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  editModalCloseButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  editModalBody: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  editModalInput: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: FreeShowTheme.spacing.sm,
  },
  editModalButton: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  editModalCancelButton: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalSaveButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  editModalCancelText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  editModalSaveText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
});

export default ConnectionHistoryScreen;