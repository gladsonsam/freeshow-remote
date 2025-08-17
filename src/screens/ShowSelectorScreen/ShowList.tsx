import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import ShowCard from './ShowCard';
import { ShowOption } from '../../types';

interface ShowListProps {
  showOptions: ShowOption[];
  isTablet: boolean;
  isSmallScreen: boolean;
  isGrid: boolean;
  onShowSelect: (show: ShowOption) => void;
  onLongPress: (show: ShowOption) => void;
}

const ShowList: React.FC<ShowListProps> = ({
  showOptions,
  isTablet,
  isSmallScreen,
  isGrid,
  onShowSelect,
  onLongPress,
}) => {
  return (
    <View style={[
      styles.showList,
      {
        paddingHorizontal: isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
        paddingTop: isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
      }
    ]}>
      <Text style={[
        styles.sectionTitle,
        { fontSize: isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
      ]}>
        Choose an interface:
      </Text>
      <View style={[isGrid ? styles.cardsGrid : styles.cardsColumn]}>
        {showOptions.map((show, index) => (
          <ShowCard
            key={show.id}
            show={show}
            onPress={() => onShowSelect(show)}
            onLongPress={() => onLongPress(show)}
            isTablet={isTablet}
            isSmallScreen={isSmallScreen}
            isGrid={isGrid}
            index={index}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  showList: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    marginBottom: FreeShowTheme.spacing.md,
    paddingHorizontal: 2, // Align with card content
    fontFamily: FreeShowTheme.fonts.system,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardsColumn: {
    flexDirection: 'column',
  },
});

export default ShowList;