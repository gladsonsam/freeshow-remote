import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { ShowOption } from '../../types';

interface ShowCardProps {
  show: ShowOption;
  onPress: () => void;
  onLongPress: () => void;
  isTablet: boolean;
  isSmallScreen: boolean;
  isGrid: boolean;
  index: number;
}

const ShowCard: React.FC<ShowCardProps> = ({
  show,
  onPress,
  onLongPress,
  isTablet,
  isSmallScreen,
  isGrid,
  index,
}) => {
  const isDisabled = !show.port || show.port === 0;

  // Gradient tuning per device form-factor
  let gradientColors: [any, any, ...any[]];
  let gradientLocations: [number, number, ...number[]];
  if (isDisabled) {
    gradientColors = ['#1E1E22', '#1A1A1F'] as [any, any, ...any[]];
    gradientLocations = [0, 1] as [number, number, ...number[]];
  } else if (isTablet) {
    // Tablet: normal two-stop gradient but using the same colors as phone
    gradientColors = [
      FreeShowTheme.colors.primaryDarker,
      (show.color as string) + '24',
    ] as [any, any, ...any[]];
    gradientLocations = [0, 1] as [number, number, ...number[]];
  } else {
    // Phone: sharp but narrow central band
    gradientColors = [
      FreeShowTheme.colors.primaryDarker,
      (show.color as string) + '24',
      (show.color as string) + '24',
      FreeShowTheme.colors.primaryDarker,
    ] as [any, any, ...any[]];
    gradientLocations = [0, 0.47, 0.53, 1] as [number, number, ...number[]];
  }

  const gradientStart = { x: 0, y: 0 } as const;
  const gradientEnd = { x: 1, y: 0 } as const; // Always horizontal to avoid tablet bands

  return (
    <View
      style={[
        styles.cardWrapper,
        isGrid && {
          width: '48%',
          marginRight: index % 2 === 0 ? FreeShowTheme.spacing.md : 0,
        },
        {
          marginBottom: isTablet
            ? FreeShowTheme.spacing.lg
            : isSmallScreen
            ? FreeShowTheme.spacing.sm
            : FreeShowTheme.spacing.md,
        },
      ]}
    >
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        android_ripple={{ color: show.color + '22' }}
        accessibilityRole="button"
        accessibilityLabel={`${show.title}. ${show.description}`}
        style={({ pressed }) => [
          styles.pressableCard,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          isDisabled && styles.disabledCard,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          start={gradientStart}
          end={gradientEnd}
          style={[
            styles.showCard,
            styles.cardShadow,
            {
              borderLeftColor: isDisabled ? '#666666' : show.color,
              padding: isTablet
                ? FreeShowTheme.spacing.xxl
                : isSmallScreen
                ? FreeShowTheme.spacing.md
                : FreeShowTheme.spacing.lg,
              minHeight: isTablet ? 120 : isSmallScreen ? 84 : 100,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDisabled ? '#404040' : show.color + '25',
                width: isTablet ? 72 : 56,
                height: isTablet ? 72 : 56,
              },
            ]}
          >
            <Ionicons
              name={show.icon as any}
              size={isTablet ? 40 : 32}
              color={isDisabled ? '#666666' : show.color}
            />
          </View>

          <View style={styles.showInfo}>
            <Text
              style={[
                styles.showTitle,
                isDisabled && styles.disabledText,
                {
                  fontSize: isTablet
                    ? FreeShowTheme.fontSize.xl
                    : isSmallScreen
                    ? FreeShowTheme.fontSize.md
                    : FreeShowTheme.fontSize.lg,
                  marginBottom: isTablet ? 8 : 6,
                },
              ]}
              numberOfLines={1}
            >
              {show.title}
            </Text>
            <Text
              style={[
                styles.showDescription,
                isDisabled && styles.disabledText,
                {
                  fontSize: isTablet
                    ? FreeShowTheme.fontSize.md
                    : isSmallScreen
                    ? FreeShowTheme.fontSize.xs
                    : FreeShowTheme.fontSize.sm,
                  lineHeight: isTablet ? 20 : 16,
                  marginBottom: isTablet ? 6 : 4,
                },
              ]}
              numberOfLines={1}
            >
              {show.description}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: FreeShowTheme.spacing.md,
  },
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: FreeShowTheme.borderRadius.xl, // Increased radius for modern feel
    borderLeftWidth: 6, // Thicker border for modern design
    gap: FreeShowTheme.spacing.lg, // Larger gap for spacing
    overflow: 'hidden',
  },
  pressableCard: {
    borderRadius: FreeShowTheme.borderRadius.xl, // Larger radius for smoother look
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconContainer: {
    borderRadius: FreeShowTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    letterSpacing: 0.5, // Slightly increased letter spacing for modern typography
  },
  showDescription: {
    color: FreeShowTheme.colors.text + 'BB',
    fontFamily: FreeShowTheme.fonts.system,
    letterSpacing: 0.2, // Slightly adjusted for a cleaner look
  },
  disabledCard: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#666666',
  },
});

export default ShowCard;
