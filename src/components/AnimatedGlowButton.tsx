import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface GlowLayer {
  colors: string[];
  opacity: number;
  dotSize: number | number[];
  stretch: number;
  numberOfOrbs: number;
  inset: number;
  speedMultiplier: number;
  scaleAmplitude: number;
  scaleFrequency: number;
  glowPlacement: 'inside' | 'outside';
  coverage: number;
}

interface AnimatedGlowButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  isActive?: boolean;
}

const appleIntelligenceConfig = {
  cornerRadius: 50,
  outlineWidth: 0,
  borderColor: 'rgba(255, 255, 255, 1)',
  backgroundColor: '#000',
  animationSpeed: -0.1,
  randomness: 0,
  borderSpeedMultiplier: 1,
  glowLayers: [
    {
      colors: ['rgba(15, 0, 255, 1)', 'rgba(174, 27, 110, 1)', 'rgba(207, 0, 0, 1)', 'rgba(210, 135, 9, 1)', 'rgba(255, 0, 192, 1)', 'rgba(27, 0, 255, 1)', 'rgba(0, 96, 255, 1)', 'rgba(23, 23, 96, 0.71)'],
      opacity: 0.4,
      dotSize: 70,
      stretch: 2,
      numberOfOrbs: 10,
      inset: -5,
      speedMultiplier: 1,
      scaleAmplitude: 0.2,
      scaleFrequency: 2.5,
      glowPlacement: 'inside' as const,
      coverage: 1
    },
    {
      colors: ['rgba(47, 0, 255, 0.54)', 'rgba(174, 27, 124, 1)', 'rgba(207, 0, 0, 1)', 'rgba(210, 151, 9, 0.56)', 'rgba(255, 0, 227, 1)', 'rgba(85, 0, 255, 0.5)', 'rgba(0, 96, 255, 0.25)', 'rgba(23, 23, 96, 0.71)'],
      opacity: 0.6,
      dotSize: 50,
      stretch: 2,
      numberOfOrbs: 20,
      inset: -12,
      speedMultiplier: 1,
      scaleAmplitude: 0.2,
      scaleFrequency: 2.5,
      glowPlacement: 'inside' as const,
      coverage: 1
    },
    {
      colors: ['rgba(233, 227, 255, 1)', 'rgba(255, 84, 197, 1)', 'rgba(255, 38, 87, 1)', 'rgba(255, 113, 0, 1)', 'rgba(255, 65, 65, 1)', 'rgba(219, 202, 255, 1)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.71)'],
      opacity: 1,
      dotSize: 20,
      stretch: 4,
      numberOfOrbs: 34,
      inset: -6,
      speedMultiplier: 1,
      scaleAmplitude: 0.02,
      scaleFrequency: 2.5,
      glowPlacement: 'inside' as const,
      coverage: 1
    },
    {
      colors: ['rgba(0, 20, 255, 1)', 'rgba(138, 206, 255, 1)'],
      opacity: 0.1,
      dotSize: [20, 80],
      stretch: 2,
      numberOfOrbs: 5,
      inset: -4,
      speedMultiplier: 10,
      scaleAmplitude: 0,
      scaleFrequency: 2.5,
      glowPlacement: 'inside' as const,
      coverage: 0.3
    },
    {
      colors: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
      opacity: 0.5,
      dotSize: [2, 12, 2],
      stretch: 6,
      numberOfOrbs: 8,
      inset: -2,
      speedMultiplier: 10,
      scaleAmplitude: 0,
      scaleFrequency: 2.5,
      glowPlacement: 'inside' as const,
      coverage: 0.2
    }
  ]
};

const AnimatedGlowButton: React.FC<AnimatedGlowButtonProps> = ({
  children,
  onPress,
  style,
  isActive = false
}) => {
  const animationValues = useRef(
    appleIntelligenceConfig.glowLayers.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Start animations for all layers
      const animations = animationValues.map((animValue, index) => {
        const layer = appleIntelligenceConfig.glowLayers[index];
        return Animated.loop(
          Animated.timing(animValue, {
            toValue: 1,
            duration: 4000 / Math.abs(layer.speedMultiplier || 1),
            useNativeDriver: true,
          }),
          { iterations: -1 }
        );
      });

      animations.forEach(animation => animation.start());

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      // Stop all animations
      animationValues.forEach(animValue => {
        animValue.stopAnimation();
        animValue.setValue(0);
      });
    }
  }, [isActive, animationValues]);

  const renderGlowLayer = (layer: GlowLayer, index: number) => {
    const animValue = animationValues[index];
    
    return (
      <Animated.View
        key={index}
        style={[
          styles.glowLayer,
          {
            opacity: layer.opacity,
            borderRadius: appleIntelligenceConfig.cornerRadius,
            transform: [{
              rotate: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${360 * layer.speedMultiplier}deg`],
              })
            }]
          }
        ]}
      >
        {Array.from({ length: Math.min(layer.numberOfOrbs, 8) }).map((_, orbIndex) => {
          const angle = (orbIndex / Math.min(layer.numberOfOrbs, 8)) * 2 * Math.PI;
          const radius = 15 + Math.abs(layer.inset);
          
          const orbSize = Array.isArray(layer.dotSize) 
            ? layer.dotSize[orbIndex % layer.dotSize.length] 
            : Math.min(layer.dotSize, 12); // Limit orb size for performance

          const colorIndex = orbIndex % layer.colors.length;
          
          return (
            <View
              key={orbIndex}
              style={[
                styles.orb,
                {
                  width: orbSize,
                  height: orbSize,
                  backgroundColor: layer.colors[colorIndex],
                  borderRadius: orbSize / 2,
                  position: 'absolute',
                  left: Math.cos(angle) * radius + 25,
                  top: Math.sin(angle) * radius + 15,
                }
              ]}
            />
          );
        })}
      </Animated.View>
    );
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]} activeOpacity={0.8}>
      <View style={styles.glowContainer}>
        {isActive && appleIntelligenceConfig.glowLayers.map((layer, index) => 
          renderGlowLayer(layer, index)
        )}
        <View style={[
          styles.button,
          {
            backgroundColor: appleIntelligenceConfig.backgroundColor,
            borderRadius: appleIntelligenceConfig.cornerRadius,
          }
        ]}>
          {children}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glowContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
});

export default AnimatedGlowButton;
