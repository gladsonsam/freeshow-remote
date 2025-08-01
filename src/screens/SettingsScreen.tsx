import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';

interface SettingsScreenProps {
  navigation: any;
}

interface ShowOption {
  id: 'none' | 'remote' | 'stage' | 'control' | 'output' | 'api';
  title: string;
  description: string;
  icon: string;
  color: string;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { settings, history, actions } = useSettings();
  const [autoReconnect, setAutoReconnect] = useState(settings?.autoReconnect || false);
  const [autoLaunchInterface, setAutoLaunchInterface] = useState(settings?.autoLaunchInterface || 'none');
  const [navigationLayout, setNavigationLayout] = useState(settings?.navigationLayout || 'bottomBar');
  const [showLaunchPicker, setShowLaunchPicker] = useState(false);


  const showOptions: ShowOption[] = [
    {
      id: 'none',
      title: 'None',
      description: 'Stay on Connect screen',
      icon: 'close-circle',
      color: FreeShowTheme.colors.textSecondary,
    },
    {
      id: 'remote',
      title: 'RemoteShow',
      description: 'Control slides and presentations remotely',
      icon: 'play-circle',
      color: '#f0008c',
    },
    {
      id: 'stage',
      title: 'StageShow',
      description: 'Stage display for performers and speakers',
      icon: 'desktop',
      color: '#2ECC40',
    },
    {
      id: 'control',
      title: 'ControlShow',
      description: 'Full control interface for operators',
      icon: 'settings',
      color: '#0074D9',
    },
    {
      id: 'output',
      title: 'OutputShow',
      description: 'Output display for screens and projectors',
      icon: 'tv',
      color: '#FF851B',
    },
    {
      id: 'api',
      title: 'API Controls',
      description: 'Custom native controls using FreeShow API',
      icon: 'code-slash',
      color: '#B10DC9',
    },
  ];

  useEffect(() => {
    if (settings) {
      setAutoReconnect(settings.autoReconnect || false);
      setAutoLaunchInterface(settings.autoLaunchInterface || 'none');
      setNavigationLayout(settings.navigationLayout || 'bottomBar');
    }
  }, [settings]);

  const handleAutoReconnectToggle = async (value: boolean) => {
    setAutoReconnect(value);
    await actions.updateSettings({ autoReconnect: value });
  };

  const handleAutoLaunchSelect = async (showId: string) => {
    const typedShowId = showId as 'none' | 'remote' | 'stage' | 'control' | 'output' | 'api';
    setAutoLaunchInterface(typedShowId);
    await actions.updateSettings({ autoLaunchInterface: typedShowId });
    setShowLaunchPicker(false);
  };

  const handleNavigationLayoutToggle = async (value: boolean) => {
    const newLayout = value ? 'sidebar' : 'bottomBar';
    setNavigationLayout(newLayout);
    await actions.updateSettings({ navigationLayout: newLayout });
  };

  const getSelectedShow = () => {
    return showOptions.find(option => option.id === autoLaunchInterface) || showOptions[0];
  };

  const selectedShow = getSelectedShow();

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
      </View>
    );
  }


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

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="play-circle" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.settingTitle}>Auto-Launch Interface</Text>
              </View>
              <Text style={styles.settingDescription}>
                Automatically open a specific interface when the app starts
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowLaunchPicker(true)}
            >
              <View style={styles.pickerButtonContent}>
                <Ionicons name={selectedShow.icon as any} size={16} color={selectedShow.color} />
                <Text style={styles.pickerButtonText}>{selectedShow.title}</Text>
                <Ionicons name="chevron-down" size={16} color={FreeShowTheme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="menu" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.settingTitle}>Navigation Layout</Text>
              </View>
              <Text style={styles.settingDescription}>
                Choose between bottom bar navigation or a collapsible sidebar
              </Text>
            </View>
            <Switch
              value={navigationLayout === 'sidebar'}
              onValueChange={handleNavigationLayoutToggle}
              trackColor={{ 
                false: FreeShowTheme.colors.primaryLighter, 
                true: FreeShowTheme.colors.secondary + '40' 
              }}
              thumbColor={navigationLayout === 'sidebar' ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary}
              ios_backgroundColor={FreeShowTheme.colors.primaryLighter}
            />
          </View>
        </View>

        {/* Section Separator */}
        <View style={styles.sectionSeparator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>HISTORY</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Connection History Section */}
        <View style={styles.historyCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="time" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.settingTitle}>Connection History</Text>
              </View>
              <Text style={styles.settingDescription}>
                View and manage all past connections ({history.length} total)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('ConnectionHistory')}
            >
              <Text style={styles.historyButtonText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Separator */}
        <View style={styles.sectionSeparator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>INFO</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* About Section */}
        <View style={styles.historyCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.settingTitleRow}>
                <Ionicons name="information-circle" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.settingTitle}>About</Text>
              </View>
              <Text style={styles.settingDescription}>
                App information, links, and platform availability
              </Text>
            </View>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('About')}
            >
              <Text style={styles.historyButtonText}>View</Text>
              <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>



      {/* Auto-Launch Picker Modal */}
      <Modal
        visible={showLaunchPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLaunchPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto-Launch Interface</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLaunchPicker(false)}
              >
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList}>
              {showOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    autoLaunchInterface === option.id && styles.modalOptionSelected
                  ]}
                  onPress={() => handleAutoLaunchSelect(option.id)}
                >
                  <View style={styles.modalOptionIcon}>
                    <Ionicons name={option.icon as any} size={20} color={option.color} />
                  </View>
                  <View style={styles.modalOptionInfo}>
                    <Text style={styles.modalOptionTitle}>{option.title}</Text>
                    <Text style={styles.modalOptionDescription}>{option.description}</Text>
                  </View>
                  {autoLaunchInterface === option.id && (
                    <Ionicons name="checkmark-circle" size={20} color={FreeShowTheme.colors.secondary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: FreeShowTheme.spacing.xxl,
    paddingHorizontal: FreeShowTheme.spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    opacity: 0.5,
  },
  separatorText: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '700',
    color: FreeShowTheme.colors.textSecondary,
    letterSpacing: 1.5,
    marginHorizontal: FreeShowTheme.spacing.lg,
  },
  historyCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    borderStyle: 'dashed',
    opacity: 0.95,
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
  settingDivider: {
    height: 1,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    marginVertical: FreeShowTheme.spacing.lg,
  },
  pickerButton: {
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    borderRadius: FreeShowTheme.borderRadius.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    minWidth: 120,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.xs,
    marginRight: FreeShowTheme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    width: '90%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  modalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  modalCloseButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  modalOptionSelected: {
    backgroundColor: FreeShowTheme.colors.secondary + '10',
  },
  modalOptionIcon: {
    marginRight: FreeShowTheme.spacing.md,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs / 2,
  },
  modalOptionDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 18,
  },
  
  // Connection History Styles
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  historyButtonText: {
    fontSize: 14,
    color: FreeShowTheme.colors.secondary,
    fontWeight: '600',
    marginRight: 4,
  },


});

export default SettingsScreen; 