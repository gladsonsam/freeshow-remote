import { Dimensions } from 'react-native';
import { useIsTV } from '../hooks/useIsTV';
import { use } from 'react';

export interface NavigationLayoutInfo {
  isTablet: boolean;
  isTV: boolean;
  shouldSkipSafeArea: boolean;
}

export const getNavigationLayoutInfo = (): NavigationLayoutInfo => {
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;
  const isTV = useIsTV();
  const shouldSkipSafeArea = !isTV && !isTablet;

  return {
    isTablet,
    isTV,
    shouldSkipSafeArea,
  };
};

export const getBottomPadding = (): number => {
  const isTV = useIsTV();
  return isTV ? 40 : 120;
};
