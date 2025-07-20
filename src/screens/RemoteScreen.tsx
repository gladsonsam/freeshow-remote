import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useConnection } from '../contexts/ConnectionContext';
import { FreeShowTheme } from '../theme/FreeShowTheme';

export default function RemoteScreen() {
  const { isConnected, freeShowService } = useConnection();

  const controlButtons = [
    { label: 'Previous', action: 'previous', icon: '⏮️' },
    { label: 'Next', action: 'next', icon: '⏭️' },
    { label: 'Clear', action: 'clear', icon: '🔄' },
    { label: 'Black', action: 'black', icon: '⚫' },
  ];

  const handleControl = async (action: string) => {
    if (!isConnected || !freeShowService) {
      Alert.alert('Not Connected', 'Please connect to FreeShow first');
      return;
    }

    try {
      switch (action) {
        case 'previous':
          freeShowService.previousSlide();
          break;
        case 'next':
          freeShowService.nextSlide();
          break;
        case 'clear':
          freeShowService.clearAll();
          break;
        case 'black':
          freeShowService.clearSlide();
          break;
        case 'start_show':
          // This would need a show ID - for now just clear
          freeShowService.clearAll();
          break;
        case 'stop_show':
          freeShowService.clearAll();
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send command');
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <Text style={styles.notConnectedText}>Connect to FreeShow to use remote controls</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage Controls</Text>
          <View style={styles.controlGrid}>
            {controlButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={styles.controlButton}
                onPress={() => handleControl(button.action)}
              >
                <Text style={styles.controlIcon}>{button.icon}</Text>
                <Text style={styles.controlLabel}>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleControl('start_show')}
          >
            <Text style={styles.actionButtonText}>Start Show</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => handleControl('stop_show')}
          >
            <Text style={styles.actionButtonText}>Stop Show</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notConnectedText: {
    fontSize: 16,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginBottom: 15,
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: FreeShowTheme.colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.border,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 14,
    color: FreeShowTheme.colors.text,
    fontWeight: '500',
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: FreeShowTheme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: FreeShowTheme.colors.surface,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
});
