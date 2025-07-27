import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';
import { ShowOption } from '../types';

interface ShowSelectorScreenProps {
  navigation: any;
}

const ShowSelectorScreen: React.FC<ShowSelectorScreenProps> = ({ navigation }) => {
  const { state, actions } = useConnection();
  const { isConnected, connectionHost, currentShowPorts } = state;
  const { disconnect } = actions;

  const getShowOptions = () => {
    const defaultPorts = {
      remote: 5510,
      stage: 5511,
      control: 5512,
      output: 5513,
      api: 5505,
    };

    // Use current show ports if available, otherwise fall back to defaults
    const showPorts = currentShowPorts || defaultPorts;

    return [
      {
        id: 'remote',
        title: 'RemoteShow',
        description: 'Control slides and presentations remotely',
        port: showPorts.remote,
        icon: 'play-circle',
        color: '#f0008c',
      },
      {
        id: 'stage',
        title: 'StageShow',
        description: 'Stage display for performers and speakers',
        port: showPorts.stage,
        icon: 'desktop',
        color: '#2ECC40',
      },
      {
        id: 'control',
        title: 'ControlShow',
        description: 'Full control interface for operators',
        port: showPorts.control,
        icon: 'settings',
        color: '#0074D9',
      },
      {
        id: 'output',
        title: 'OutputShow',
        description: 'Output display for screens and projectors',
        port: showPorts.output,
        icon: 'tv',
        color: '#FF851B',
      },
      {
        id: 'api',
        title: 'API Controls',
        description: 'Custom native controls using FreeShow API',
        port: showPorts.api,
        icon: 'code-slash',
        color: '#B10DC9',
      },
    ];
  };

  const showOptions = getShowOptions();

  const handleShowSelect = (show: ShowOption) => {
    if (!isConnected || !connectionHost) {
      Alert.alert('Error', 'Not connected to FreeShow');
      return;
    }

    if (show.id === 'api') {
      // Navigate to APIScreen for API interface
      navigation.getParent()?.navigate('APIScreen', {
        title: show.title,
        showId: show.id,
      });
    } else {
      // Navigate to WebView for other interfaces
      const url = `http://${connectionHost}:${show.port}`;
      
      navigation.getParent()?.navigate('WebView', {
        url,
        title: show.title,
        showId: show.id,
      });
    }
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
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>FreeShow Interfaces</Text>
              <Text style={styles.subtitle}>
                Connected to {connectionHost}
              </Text>
            </View>
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Ionicons name="log-out-outline" size={22} color={FreeShowTheme.colors.text + 'CC'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.showList}>
          <Text style={styles.sectionTitle}>Choose an interface:</Text>
          {showOptions.map((show) => (
            <TouchableOpacity
              key={show.id}
              style={[styles.showCard, { borderLeftColor: show.color }]}
              onPress={() => handleShowSelect(show)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: show.color + '20' }]}>
                <Ionicons name={show.icon as any} size={28} color={show.color} />
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const screenHeight = Dimensions.get('window').height;
const isSmallScreen = screenHeight < 700; 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xxl, // Reduce from xl to xxl for better balance
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  disconnectButton: {
    padding: FreeShowTheme.spacing.sm,
    marginTop: -FreeShowTheme.spacing.xs, // Align with title
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    marginBottom: FreeShowTheme.spacing.md,
    paddingHorizontal: 2, // Align with card content
    fontFamily: FreeShowTheme.fonts.system,
  },
  showList: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.sm, // Reduce top padding
  },
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    borderLeftWidth: 4,
    padding: isSmallScreen ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md,
    marginBottom: isSmallScreen ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md,
    gap: FreeShowTheme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: isSmallScreen ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.lg,
    fontWeight: '700', // Increase font weight
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  showDescription: {
    fontSize: isSmallScreen ? FreeShowTheme.fontSize.xs : FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'BB', // Increase opacity slightly
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 4,
    lineHeight: 16,
  },
  showPort: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + 'AA', // Increase opacity
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chevron: {
    opacity: 0.6,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
    paddingTop: FreeShowTheme.spacing.xxl, // Reduce top padding to shift content up slightly
  },
  notConnectedTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.md, // Increase spacing
    fontFamily: FreeShowTheme.fonts.system,
    textAlign: 'center',
  },
  notConnectedText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + 'BB',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
    lineHeight: 22, // Add line height for better readability
    paddingHorizontal: FreeShowTheme.spacing.md, // Add horizontal padding
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.xl, // Increase horizontal padding
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700', // Increase font weight
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default ShowSelectorScreen;
