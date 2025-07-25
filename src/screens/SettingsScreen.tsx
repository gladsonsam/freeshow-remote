import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { state, actions } = useSettings();
  const { appSettings } = state;
  const { updateAppSettings } = actions;
  const [autoReconnect, setAutoReconnect] = useState(appSettings.autoReconnect || false);

  useEffect(() => {
    setAutoReconnect(appSettings.autoReconnect || false);
  }, [appSettings.autoReconnect]);

  const handleAutoReconnectToggle = async (value: boolean) => {
    setAutoReconnect(value);
    await updateAppSettings({ autoReconnect: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your FreeShow Remote preferences</Text>
        </View>

        {/* Settings Card */}
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="refresh" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.settingTitle}>Auto-Reconnect</Text>
              </View>
              <Text style={styles.settingDescription}>
                Automatically reconnect to FreeShow when the connection is lost
              </Text>
            </View>
            <Switch
              value={autoReconnect}
              onValueChange={handleAutoReconnectToggle}
              trackColor={{ 
                false: FreeShowTheme.colors.primaryLighter, 
                true: FreeShowTheme.colors.secondary + '40' 
              }}
              thumbColor={autoReconnect ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary}
              ios_backgroundColor={FreeShowTheme.colors.primaryLighter}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  header: {
    marginBottom: FreeShowTheme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xxl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: FreeShowTheme.spacing.md,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  settingTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  settingDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default SettingsScreen; 