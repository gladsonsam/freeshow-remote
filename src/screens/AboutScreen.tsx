import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

const packageJson = require('../../package.json');

interface AboutScreenProps {
  navigation: any;
}

const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info Card */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Image 
              source={require('../../assets/icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <View style={styles.aboutHeaderText}>
              <Text style={styles.aboutTitle}>FreeShow Remote</Text>
              <Text style={styles.aboutVersion}>v{packageJson.version}</Text>
            </View>
          </View>
          
          <Text style={styles.aboutDescription}>
            A companion mobile app for FreeShow. 
            Control your presentations remotely, manage slides, and access various FreeShow interfaces 
            directly from your mobile device.
          </Text>
        </View>

        {/* Links Card */}
        <View style={styles.linksCard}>
          <Text style={styles.sectionTitle}>Resources</Text>
          
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL(packageJson.repository.url.replace('.git', ''))}
          >
            <Ionicons name="logo-github" size={24} color={FreeShowTheme.colors.text} />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>View on GitHub</Text>
              <Text style={styles.linkDescription}>Source code, issues, and releases</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.linkDivider} />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://freeshow.app')}
          >
            <Image 
              source={require('../../assets/freeshow-icon.png')}
              style={styles.freeshowIcon}
              resizeMode="contain"
            />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>FreeShow Website</Text>
              <Text style={styles.linkDescription}>Learn more about FreeShow presentation software</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Support Card */}
        <View style={styles.supportCard}>
          <Text style={styles.sectionTitle}>Support FreeShow</Text>
          
          <TouchableOpacity
            style={styles.donationButton}
            onPress={() => Linking.openURL('https://churchapps.org/partner')}
          >
            <Ionicons name="heart" size={24} color="#ff6b6b" />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Support FreeShow Creators</Text>
              <Text style={styles.linkDescription}>Help fund the development of FreeShow</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={FreeShowTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Platform Availability Card */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color="#ff9800" />
            <Text style={styles.warningTitle}>Platform Availability</Text>
          </View>
          
          <View style={styles.platformInfo}>
            <View style={styles.platformItem}>
              <Ionicons name="logo-android" size={20} color="#4CAF50" />
              <Text style={styles.platformText}>Android - Available Now</Text>
            </View>
            <View style={styles.platformItem}>
              <Ionicons name="logo-apple" size={20} color="#FF9800" />
              <Text style={styles.platformText}>iOS - Not Available</Text>
            </View>
          </View>

          <Text style={styles.warningDescription}>
            Currently only available for Android. The $99/year Apple Developer Program fee makes iOS 
            distribution unfeasible for this free app.
          </Text>
          
          <Text style={styles.warningCallout}>
            📱 If you're interested in sponsoring iOS distribution or publishing this on the App Store, 
            please open an issue on GitHub or contact me!
          </Text>
          
          <Text style={styles.warningFooter}>
            Android users can download the APK from the GitHub releases page. A Play Store release is planned for the future.
          </Text>
        </View>

        {/* Made By Section */}
        <View style={styles.madeBySection}>
          <Text style={styles.madeByText}>Made by Gladson Sam</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  backButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  headerTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  
  // Cards
  aboutCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  linksCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  supportCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  warningCard: {
    backgroundColor: '#ff980008',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: '#ff980030',
    marginBottom: FreeShowTheme.spacing.lg,
  },

  // About Section
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  aboutHeaderText: {
    marginLeft: FreeShowTheme.spacing.md,
  },
  aboutTitle: {
    fontSize: FreeShowTheme.fontSize.xxl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  aboutVersion: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  aboutDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 22,
  },

  // Section Titles
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },

  // Link Buttons
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
  },
  donationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  linkContent: {
    flex: 1,
    marginLeft: FreeShowTheme.spacing.md,
  },
  linkTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
  },
  linkDivider: {
    height: 1,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    marginVertical: FreeShowTheme.spacing.xs,
  },



  // Warning Section
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  warningTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: '#ff9800',
    marginLeft: FreeShowTheme.spacing.sm,
  },
  platformInfo: {
    marginBottom: FreeShowTheme.spacing.md,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  platformText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  warningDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: FreeShowTheme.spacing.md,
  },
  warningCallout: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: FreeShowTheme.spacing.md,
    padding: FreeShowTheme.spacing.sm,
    backgroundColor: '#ff980015',
    borderRadius: FreeShowTheme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  warningFooter: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 18,
  },

  // Icon Styles
  appIcon: {
    width: 32,
    height: 32,
  },
  freeshowIcon: {
    width: 24,
    height: 24,
  },

  // Made By Section
  madeBySection: {
    marginTop: FreeShowTheme.spacing.xl,
    paddingTop: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
    alignItems: 'center',
  },
  madeByText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontStyle: 'italic',
    opacity: 0.8,
  },
});

export default AboutScreen;