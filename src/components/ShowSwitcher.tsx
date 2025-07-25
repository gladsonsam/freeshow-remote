import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import { useConnection } from '../contexts';
import { ErrorLogger } from '../services/ErrorLogger';
import { configService } from '../config/AppConfig';

interface ShowSwitcherProps {
  currentTitle: string;
  currentShowId: string;
  connectionHost: string;
  showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  };
  onShowSelect: (show: ShowOption) => void;
}

const ShowSwitcher: React.FC<ShowSwitcherProps> = ({
  currentTitle,
  currentShowId,
  connectionHost,
  showPorts,
  onShowSelect,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Memoize the default ports configuration
  const defaultPorts = useMemo(() => configService.getConfig().defaultShowPorts, []);

  // Memoize show options calculation - only recalculates when showPorts changes
  const showOptions = useMemo((): ShowOption[] => {
    // Use provided show ports or fall back to defaults
    const actualPorts = showPorts || defaultPorts;

    return [
      {
        id: 'remote',
        title: 'RemoteShow',
        description: 'Control slides and presentations remotely',
        port: actualPorts.remote,
        icon: 'play-circle',
        color: '#f0008c',
      },
      {
        id: 'stage',
        title: 'StageShow',
        description: 'Stage display for performers and speakers',
        port: actualPorts.stage,
        icon: 'desktop',
        color: '#2ECC40',
      },
      {
        id: 'control',
        title: 'ControlShow',
        description: 'Full control interface for operators',
        port: actualPorts.control,
        icon: 'settings',
        color: '#0074D9',
      },
      {
        id: 'output',
        title: 'OutputShow',
        description: 'Output display for screens and projectors',
        port: actualPorts.output,
        icon: 'tv',
        color: '#FF851B',
      },
    ];
  }, [showPorts, defaultPorts]);

  // Memoize current show lookup - only recalculates when showOptions or currentShowId changes
  const currentShow = useMemo(() => {
    return showOptions.find(show => show.id === currentShowId);
  }, [showOptions, currentShowId]);

  // Memoize event handlers to prevent prop drilling and unnecessary re-renders
  const handleShowSelect = useCallback((show: ShowOption) => {
    ErrorLogger.debug('ShowSwitcher - handleShowSelect called with', 'ShowSwitcher', { show });
    setModalVisible(false);
    onShowSelect(show);
  }, [onShowSelect]);

  const handleOpenModal = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <>
      <TouchableOpacity 
        style={styles.titleContainer} 
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{currentTitle}</Text>
        <Ionicons name="chevron-down" size={16} color={FreeShowTheme.colors.text + '99'} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backgroundTouchable}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Interface</Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
              </TouchableOpacity>
            </View>

            {currentShow && (
              <View style={styles.currentShowSection}>
                <Text style={styles.sectionTitle}>Current</Text>
                <View style={[styles.showItem, styles.currentShowItem, { borderLeftColor: currentShow.color }]}>
                  <View style={[styles.iconContainer, { backgroundColor: currentShow.color + '20' }]}>
                    <Ionicons name={currentShow.icon as any} size={24} color={currentShow.color} />
                  </View>
                  <View style={styles.showInfo}>
                    <Text style={styles.showTitle}>{currentShow.title}</Text>
                    <Text style={styles.showDescription}>{currentShow.description}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={currentShow.color} />
                </View>
              </View>
            )}

            <View style={styles.otherShowsSection}>
              <Text style={styles.sectionTitle}>Available Interfaces</Text>
              <View style={styles.showsList}>
                {showOptions.map((show) => {
                  // Skip current show
                  if (show.id === currentShowId) return null;
                  
                  return (
                    <TouchableOpacity
                      key={show.id}
                      style={[styles.showItem, { borderLeftColor: show.color }]}
                      onPress={() => handleShowSelect(show)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: show.color + '20' }]}>
                        <Ionicons name={show.icon as any} size={24} color={show.color} />
                      </View>
                      <View style={styles.showInfo}>
                        <Text style={styles.showTitle}>{show.title}</Text>
                        <Text style={styles.showDescription}>{show.description}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.text + '66'} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: FreeShowTheme.spacing.md,
    gap: FreeShowTheme.spacing.xs,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
  },
  backgroundTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    minHeight: 400,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  modalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  currentShowSection: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.md,
  },
  otherShowsSection: {
    padding: FreeShowTheme.spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.sm,
    textTransform: 'uppercase',
  },
  showsList: {
    // No max height needed since we removed scrolling
  },
  showItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    borderLeftWidth: 3,
    padding: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
    gap: FreeShowTheme.spacing.sm,
  },
  currentShowItem: {
    backgroundColor: FreeShowTheme.colors.primaryLighter,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  showDescription: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default ShowSwitcher;
