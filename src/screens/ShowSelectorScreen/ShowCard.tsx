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
  // Check if interface is disabled (port is 0 or falsy)
  const isDisabled = !show.port || show.port === 0;
  
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
        style={({ pressed }) => ([
          styles.pressableCard,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.98 },
          isDisabled && styles.disabledCard,
        ])}
      >
        <LinearGradient
          colors={[
            FreeShowTheme.colors.primaryDarker,
            FreeShowTheme.colors.primaryDarker + 'F2',
            isDisabled ? '#66666618' : show.color + '18',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: isDisabled ? '#66666620' : show.color + '20',
              width: isTablet ? 72 : 56,
              height: isTablet ? 72 : 56,
            }
          ]}>
            <Ionicons
              name={show.icon as any}
              size={isTablet ? 40 : 32}
              color={isDisabled ? '#666666' : show.color}
            />
          </View>

          <View style={styles.showInfo}>
            <Text style={[
              styles.showTitle,
              isDisabled && styles.disabledText,
              {
                fontSize: isTablet
                  ? FreeShowTheme.fontSize.xl
                  : (isSmallScreen ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.lg),
                marginBottom: isTablet ? 8 : 6,
              }
            ]} numberOfLines={1}>
              {show.title}
            </Text>
            <Text style={[
              styles.showDescription,
              isDisabled && styles.disabledText,
              {
                fontSize: isTablet
                  ? FreeShowTheme.fontSize.md
                  : (isSmallScreen ? FreeShowTheme.fontSize.xs : FreeShowTheme.fontSize.sm),
                lineHeight: isTablet ? 20 : 16,
                marginBottom: isTablet ? 6 : 4,
              }
            ]} numberOfLines={1}>
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
  },
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderLeftWidth: 4,
    gap: FreeShowTheme.spacing.md,
    overflow: 'hidden', // Ensure gradient fills the entire card
  },
  pressableCard: {
    borderRadius: FreeShowTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconContainer: {
    borderRadius: FreeShowTheme.borderRadius.md,
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
  },
  showDescription: {
    color: FreeShowTheme.colors.text + 'BB',
    fontFamily: FreeShowTheme.fonts.system,
  },
  disabledCard: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#666666',
  },
});

export default ShowCard;