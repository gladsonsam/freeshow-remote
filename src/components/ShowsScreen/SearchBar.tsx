import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClearSearch: () => void;
  showCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  showCount,
}) => {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color={FreeShowTheme.colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={onSearchChange}
        placeholder={`Search shows (${showCount})...`}
        placeholderTextColor={FreeShowTheme.colors.textSecondary + '80'}
      />
      {searchTerm.length > 0 && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={onClearSearch}
        >
          <Ionicons name="close-circle" size={20} color={FreeShowTheme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    marginHorizontal: FreeShowTheme.spacing.lg,
    marginVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  searchInput: {
    flex: 1,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  clearSearchButton: {
    padding: FreeShowTheme.spacing.xs,
  },
});
