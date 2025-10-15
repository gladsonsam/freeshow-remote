import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to detect if the app is running on a TV device.
 * Uses React Native's Platform and feature detection where available.
 */
export const useIsTV = () => {
  const [isTV, setIsTV] = useState<boolean>(false);

  useEffect(() => {
    try {
      // Platform.isTV is available on react-native and indicates TV devices (Apple TV, Android TV)
      // Fallback to checking Platform.OS in case of environments where isTV isn't present.
      const maybeIsTV = (Platform as any).isTV ?? false;

      // Some hosted runtimes (Expo) expose "isTV" on Platform.OS === 'android' via Platform.constants
      if (!maybeIsTV && Platform.OS === 'android') {
        const constants = (Platform as any).Constants || (Platform as any).constants;
        if (constants && typeof constants.isTV === 'boolean') {
          setIsTV(constants.isTV);
          return;
        }
      }

      setIsTV(!!maybeIsTV);
    } catch (e) {
      setIsTV(false);
    }
  }, []);

  return isTV;
};
