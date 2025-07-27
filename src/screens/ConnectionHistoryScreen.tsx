import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnectionHistory } from '../contexts';
import { ConnectionHistory, settingsRepository } from '../repositories';

interface ConnectionHistoryScreenProps {
  navigation: any;
}

const ConnectionHistoryScreen: React.FC<ConnectionHistoryScreenProps> = ({ navigation }) => {
  const [connectionHistory, historyActions] = useConnectionHistory();
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionHistory | null>(null);
  const [editNicknameText, setEditNicknameText] = useState('');

  const handleRemoveFromHistory = async (id: string) => {
    Alert.alert(
      'Remove Connection',
      'Are you sure you want to remove this connection from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await historyActions.remove(id);
            } catch (error) {
              console.error('Failed to remove connection from history:', error);
              Alert.alert('Error', 'Failed to remove connection from history');
            }
          },
        },
      ]
    );
  };

  const handleClearAllHistory = async () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all connection history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await historyActions.clear();
            } catch (error) {
              console.error('Failed to clear connection history:', error);
              Alert.alert('Error', 'Failed to clear connection history');
            }
          },
        },
      ]
    );
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
      setShowEditNickname(false);
      setEditingConnection(null);
      setEditNicknameText('');
    } catch (error) {
      console.error('Failed to update nickname:', error);
      Alert.alert('Error', 'Failed to update connection name');
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
            {connectionHistory.length} {connectionHistory.length === 1 ? 'connection' : 'connections'}
          </Text>
        </View>
        {connectionHistory.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAllHistory}
          >
            <Ionicons name="trash-outline" size={20} color={FreeShowTheme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {connectionHistory.length > 0 ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {connectionHistory.map((item: ConnectionHistory, index: number) => (
            <View key={item.id} style={styles.historyItem}>
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
                     onPress={() => handleEditNickname(item)}
                   >
                     <Ionicons name="create-outline" size={18} color={FreeShowTheme.colors.textSecondary} />
                   </TouchableOpacity>
                   <TouchableOpacity
                     style={styles.deleteButton}
                     onPress={() => handleRemoveFromHistory(item.id)}
                   >
                     <Ionicons name="trash-outline" size={18} color={FreeShowTheme.colors.textSecondary} />
                   </TouchableOpacity>
                 </View>
              </View>
              
              {item.showPorts && (
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
            </View>
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