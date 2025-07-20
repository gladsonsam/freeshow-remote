import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts/ConnectionContext';

interface ShowSelectorScreenProps {
  navigation: any;
}

interface ShowOption {
  id: string;
  title: string;
  description: string;
  port: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const showOptions: ShowOption[] = [
  {
    id: 'remote',
    title: 'RemoteShow',
    description: 'Control slides and presentations remotely',
    port: 5510,
    icon: 'play-circle',
    color: '#f0008c',
  },
  {
    id: 'stage',
    title: 'StageShow',
    description: 'Stage display for performers and speakers',
    port: 5511,
    icon: 'desktop',
    color: '#2ECC40',
  },
  {
    id: 'control',
    title: 'ControlShow',
    description: 'Full control interface for operators',
    port: 5512,
    icon: 'settings',
    color: '#0074D9',
  },
  {
    id: 'output',
    title: 'OutputShow',
    description: 'Output display for screens and projectors',
    port: 5513,
    icon: 'tv',
    color: '#FF851B',
  },
];

const ShowSelectorScreen: React.FC<ShowSelectorScreenProps> = ({ navigation }) => {
  const { isConnected, connectionHost, disconnect } = useConnection();

  const handleShowSelect = (show: ShowOption) => {
    if (!isConnected || !connectionHost) {
      Alert.alert('Error', 'Not connected to FreeShow');
      return;
    }

    const url = `http://${connectionHost}:${show.port}`;
    
    // Navigate to the WebView screen in the parent stack
    navigation.getParent()?.navigate('WebView', {
      url,
      title: show.title,
      showId: show.id,
    });
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from FreeShow?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            navigation.navigate('Connect');
          }
        },
      ]
    );
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <Ionicons name="cloud-offline" size={64} color={FreeShowTheme.colors.text + '66'} />
          <Text style={styles.notConnectedTitle}>Not Connected</Text>
          <Text style={styles.notConnectedText}>
            Please connect to FreeShow first to access the show interfaces.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => navigation.navigate('Connect')}
          >
            <Ionicons name="wifi" size={20} color="white" />
            <Text style={styles.buttonText}>Go to Connect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons name="apps" size={32} color={FreeShowTheme.colors.secondary} />
          <Text style={styles.title}>FreeShow Interfaces</Text>
        </View>
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Ionicons name="log-out" size={20} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Connected to {connectionHost} - Choose an interface to open:
      </Text>

      <ScrollView style={styles.showList} showsVerticalScrollIndicator={false}>
        {showOptions.map((show) => (
          <TouchableOpacity
            key={show.id}
            style={[styles.showCard, { borderLeftColor: show.color }]}
            onPress={() => handleShowSelect(show)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: show.color + '20' }]}>
              <Ionicons name={show.icon} size={28} color={show.color} />
            </View>
            
            <View style={styles.showInfo}>
              <Text style={styles.showTitle}>{show.title}</Text>
              <Text style={styles.showDescription}>{show.description}</Text>
              <Text style={styles.showPort}>Port: {show.port}</Text>
            </View>
            
            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.text + '66'} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap any interface to open it in a web view
        </Text>
      </View>
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
    justifyContent: 'space-between',
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.md,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + '99',
    marginHorizontal: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    fontFamily: FreeShowTheme.fonts.system,
  },
  disconnectButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  showList: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    borderLeftWidth: 4,
    padding: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.md,
    gap: FreeShowTheme.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  showDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 4,
  },
  showPort: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  chevron: {
    opacity: 0.6,
  },
  footer: {
    padding: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
  },
  footerText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    fontFamily: FreeShowTheme.fonts.system,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  notConnectedTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  notConnectedText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default ShowSelectorScreen;
