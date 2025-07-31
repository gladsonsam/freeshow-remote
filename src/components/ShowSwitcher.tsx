import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ShowOption } from '../types';
import { useConnection } from '../contexts';
import { ErrorLogger } from '../services/ErrorLogger';
import { configService } from '../config/AppConfig';

// Responsive sizing utility for ShowSwitcher
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) > 600;
  const isLandscape = width > height;
  
  return {
    isTablet,
    isLandscape,
    screenWidth: width,
    screenHeight: height,
  };
};

interface ShowSwitcherProps {
  currentTitle: string;
  currentShowId: string;
  connectionHost: string;
  showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
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
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());

  // Update dimensions when orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

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
      {
        id: 'api',
        title: 'API Controls',
        description: 'Custom native controls using FreeShow API',
        port: actualPorts.api,
        icon: 'code-slash',
        color: '#B10DC9',
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
        style={[
          styles.titleContainer,
          {
            marginHorizontal: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
            gap: dimensions.isTablet ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.xs,
          }
        ]} 
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.title,
          { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
        ]}>
          {currentTitle}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={dimensions.isTablet ? 20 : 16} 
          color={FreeShowTheme.colors.text + '99'} 
        />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={[
          styles.modalOverlay,
          { padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg }
        ]}>
          <TouchableOpacity
            style={styles.backgroundTouchable}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={[
            styles.modalContent,
            {
              maxWidth: dimensions.isTablet ? 500 : 400,
              minHeight: dimensions.isTablet ? 480 : 400,
              borderRadius: dimensions.isTablet ? FreeShowTheme.borderRadius.xl * 1.5 : FreeShowTheme.borderRadius.xl,
            }
          ]}>
            <View style={[
              styles.modalHeader,
              { padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg }
            ]}>
              <Text style={[
                styles.modalTitle,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.xl : FreeShowTheme.fontSize.lg }
              ]}>
                Switch Interface
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={[
                  styles.closeButton,
                  { padding: dimensions.isTablet ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.xs }
                ]}
              >
                <Ionicons 
                  name="close" 
                  size={dimensions.isTablet ? 28 : 24} 
                  color={FreeShowTheme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            {currentShow && (
              <View style={[
                styles.currentShowSection,
                {
                  padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
                  paddingBottom: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
                }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
                ]}>
                  Current
                </Text>
                <View style={[
                  styles.showItem, 
                  styles.currentShowItem, 
                  { 
                    borderLeftColor: currentShow.color,
                    padding: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
                    marginBottom: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                    gap: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                    minHeight: dimensions.isTablet ? 72 : 56,
                  }
                ]}>
                  <View style={[
                    styles.iconContainer, 
                    { 
                      backgroundColor: currentShow.color + '20',
                      width: dimensions.isTablet ? 48 : 40,
                      height: dimensions.isTablet ? 48 : 40,
                    }
                  ]}>
                    <Ionicons 
                      name={currentShow.icon as any} 
                      size={dimensions.isTablet ? 28 : 24} 
                      color={currentShow.color} 
                    />
                  </View>
                  <View style={styles.showInfo}>
                    <Text style={[
                      styles.showTitle,
                      { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
                    ]}>
                      {currentShow.title}
                    </Text>
                    <Text style={[
                      styles.showDescription,
                      { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.sm : FreeShowTheme.fontSize.xs }
                    ]}>
                      {currentShow.description}
                    </Text>
                  </View>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={dimensions.isTablet ? 24 : 20} 
                    color={currentShow.color} 
                  />
                </View>
              </View>
            )}

            <View style={[
              styles.otherShowsSection,
              {
                padding: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
                paddingTop: 0,
              }
            ]}>
              <Text style={[
                styles.sectionTitle,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
              ]}>
                Available Interfaces
              </Text>
              <View style={styles.showsList}>
                {showOptions.map((show) => {
                  // Skip current show
                  if (show.id === currentShowId) return null;
                  
                  return (
                    <TouchableOpacity
                      key={show.id}
                      style={[
                        styles.showItem, 
                        { 
                          borderLeftColor: show.color,
                          padding: dimensions.isTablet ? FreeShowTheme.spacing.lg : FreeShowTheme.spacing.md,
                          marginBottom: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                          gap: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
                          minHeight: dimensions.isTablet ? 72 : 56,
                        }
                      ]}
                      onPress={() => handleShowSelect(show)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.iconContainer, 
                        { 
                          backgroundColor: show.color + '20',
                          width: dimensions.isTablet ? 48 : 40,
                          height: dimensions.isTablet ? 48 : 40,
                        }
                      ]}>
                        <Ionicons 
                          name={show.icon as any} 
                          size={dimensions.isTablet ? 28 : 24} 
                          color={show.color} 
                        />
                      </View>
                      <View style={styles.showInfo}>
                        <Text style={[
                          styles.showTitle,
                          { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
                        ]}>
                          {show.title}
                        </Text>
                        <Text style={[
                          styles.showDescription,
                          { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.sm : FreeShowTheme.fontSize.xs }
                        ]}>
                          {show.description}
                        </Text>
                      </View>
                      <Ionicons 
                        name="chevron-forward" 
                        size={dimensions.isTablet ? 20 : 16} 
                        color={FreeShowTheme.colors.text + '66'} 
                      />
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
    // marginHorizontal and gap now handled dynamically
  },
  title: {
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // padding now handled dynamically
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
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    // maxWidth, minHeight, borderRadius now handled dynamically
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
    // padding now handled dynamically
  },
  modalTitle: {
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
  closeButton: {
    // padding now handled dynamically
  },
  currentShowSection: {
    // padding now handled dynamically
  },
  otherShowsSection: {
    // padding now handled dynamically
  },
  sectionTitle: {
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.sm,
    textTransform: 'uppercase',
    // fontSize now handled dynamically
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
    // padding, marginBottom, gap, minHeight now handled dynamically
  },
  currentShowItem: {
    backgroundColor: FreeShowTheme.colors.primaryLighter,
  },
  iconContainer: {
    borderRadius: FreeShowTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    // width, height now handled dynamically
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
    // fontSize now handled dynamically
  },
  showDescription: {
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
});

export default ShowSwitcher;
