import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { Show } from '../../hooks/useShowsAPI';

interface ShowCardProps {
  show: Show;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

export const ShowCard: React.FC<ShowCardProps> = ({
  show,
  onPress,
  onEdit,
  onDelete,
  fadeAnim,
  slideAnim,
}) => {
  return (
    <Animated.View style={[
      styles.showCard,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <TouchableOpacity
        style={styles.showCardTouchable}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.showCardContent}>
          <View style={styles.showCardHeader}>
            <Ionicons name="albums" size={24} color={FreeShowTheme.colors.secondary} />
            <Text style={styles.showCardTitle}>{show.name || 'Untitled Show'}</Text>
            {show.detailsLoaded && (
              <Ionicons name="checkmark-circle" size={16} color={FreeShowTheme.colors.connected} />
            )}
          </View>
          {show.category && (
            <Text style={styles.showCardCategory}>{show.category}</Text>
          )}
          <View style={styles.showCardActions}>
            <TouchableOpacity
              style={[styles.showCardActionButton, { backgroundColor: FreeShowTheme.colors.connected }]}
              onPress={onPress}
            >
              <Ionicons name="eye" size={16} color="white" />
              <Text style={styles.showCardActionText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.showCardActionButton, { backgroundColor: FreeShowTheme.colors.secondary }]}
              onPress={onEdit}
            >
              <Ionicons name="pencil" size={16} color="white" />
              <Text style={styles.showCardActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.showCardActionButton, { backgroundColor: FreeShowTheme.colors.disconnected }]}
              onPress={onDelete}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.showCardActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  showCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
    marginBottom: FreeShowTheme.spacing.md,
    marginHorizontal: FreeShowTheme.spacing.sm,
  },
  showCardTouchable: {
    padding: FreeShowTheme.spacing.lg,
  },
  showCardContent: {
    gap: FreeShowTheme.spacing.md,
  },
  showCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.md,
  },
  showCardTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    flex: 1,
  },
  showCardCategory: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    paddingHorizontal: FreeShowTheme.spacing.sm,
    paddingVertical: FreeShowTheme.spacing.xs,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  showCardActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  showCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
  },
  showCardActionText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
});
