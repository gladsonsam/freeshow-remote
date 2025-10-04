import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface ToastProps {
  visible: boolean;
  message: string;
  opacity: Animated.Value;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, opacity }) => {
  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: '10%',
    right: '10%',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  toastText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
});
