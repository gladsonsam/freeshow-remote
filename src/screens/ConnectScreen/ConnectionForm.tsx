import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { useConnection } from '../../contexts';
import { ValidationService } from '../../services/InputValidationService';
import { ErrorLogger } from '../../services/ErrorLogger';

interface ConnectionFormProps {
  host: string;
  setHost: (host: string) => void;
  remotePort: string;
  setRemotePort: (port: string) => void;
  stagePort: string;
  setStagePort: (port: string) => void;
  controlPort: string;
  setControlPort: (port: string) => void;
  outputPort: string;
  setOutputPort: (port: string) => void;
  apiPort: string;
  setApiPort: (port: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onCancelConnection: () => void;
  onShowQRScanner: () => void;
  onShowShareQR: () => void;
  navigation: any;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({
  host,
  setHost,
  remotePort,
  setRemotePort,
  stagePort,
  setStagePort,
  controlPort,
  setControlPort,
  outputPort,
  setOutputPort,
  apiPort,
  setApiPort,
  showAdvanced,
  setShowAdvanced,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
  onCancelConnection,
  onShowQRScanner,
  onShowShareQR,
  navigation: _navigation,
}) => {
  const connection = useConnection();
  const { updateShowPorts } = connection.actions;

  // Update current show ports whenever port values change and we're connected
  useEffect(() => {
    if (isConnected) {
      const showPorts = {
        remote: parseInt(remotePort) || 5510,
        stage: parseInt(stagePort) || 5511,
        control: parseInt(controlPort) || 5512,
        output: parseInt(outputPort) || 5513,
        api: parseInt(apiPort) || 5505,
      };
      updateShowPorts(showPorts);
    }
  }, [isConnected, remotePort, stagePort, controlPort, outputPort, apiPort]);

  const handleConnect = async () => {
    try {
      // Validate host input
      const hostValidation = ValidationService.validateHost(host.trim());
      if (!hostValidation.isValid) {
        // Error handling would be done in parent component
        throw new Error(`Invalid host: ${hostValidation.error || 'Please enter a valid host address'}`);
      }

      // Validate show ports
      const portsToValidate = {
        remote: remotePort,
        stage: stagePort,
        control: controlPort,
        output: outputPort,
        api: apiPort,
      };

      const validatedPorts: any = {};
      for (const [portName, portValue] of Object.entries(portsToValidate)) {
        const portValidation = ValidationService.validatePort(portValue);
        if (!portValidation.isValid) {
          throw new Error(`${portName.charAt(0).toUpperCase() + portName.slice(1)} port: ${portValidation.error}`);
        }
        validatedPorts[portName] = portValidation.sanitizedValue;
      }

      // Additional validation for show ports as a group
      const showPortsValidation = ValidationService.validateShowPorts(validatedPorts);
      if (!showPortsValidation.isValid) {
        throw new Error(showPortsValidation.error || 'Invalid port configuration');
      }

      onConnect();
    } catch (error) {
      ErrorLogger.error('Manual connection failed', 'ConnectionForm', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  return (
    <View style={styles.mainCard}>
      <Text style={styles.cardTitle}>
        {isConnected ? 'Connection Details' : 'Manual Connection'}
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Server Address</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.100"
            placeholderTextColor={FreeShowTheme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />
          <TouchableOpacity 
            style={styles.inputAction} 
            onPress={onShowQRScanner}
            disabled={isConnected}
          >
            <Ionicons name="qr-code-outline" size={22} color={FreeShowTheme.colors.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Settings Toggle */}
      <TouchableOpacity 
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={styles.advancedText}>Interface Ports</Text>
        <Ionicons 
          name={showAdvanced ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={FreeShowTheme.colors.textSecondary} 
        />
      </TouchableOpacity>

      {/* Advanced Settings */}
      {showAdvanced && (
        <View style={styles.advancedSection}>
          <View style={styles.portGrid}>
            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Remote</Text>
              <TextInput
                style={styles.portInput}
                value={remotePort}
                onChangeText={setRemotePort}
                placeholder="5510"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                editable={!isConnected}
              />
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Stage</Text>
              <TextInput
                style={styles.portInput}
                value={stagePort}
                onChangeText={setStagePort}
                placeholder="5511"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                editable={!isConnected}
              />
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Control</Text>
              <TextInput
                style={styles.portInput}
                value={controlPort}
                onChangeText={setControlPort}
                placeholder="5512"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                editable={!isConnected}
              />
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>Output</Text>
              <TextInput
                style={styles.portInput}
                value={outputPort}
                onChangeText={setOutputPort}
                placeholder="5513"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                editable={!isConnected}
              />
            </View>

            <View style={styles.portItem}>
              <Text style={styles.portLabel}>API</Text>
              <TextInput
                style={styles.portInput}
                value={apiPort}
                onChangeText={setApiPort}
                placeholder="5505"
                placeholderTextColor={FreeShowTheme.colors.textSecondary}
                keyboardType="numeric"
                maxLength={5}
                editable={!isConnected}
              />
            </View>
          </View>
        </View>
      )}

      {/* Main Action Button */}
      <View style={styles.actionContainer}>
        {isConnected ? (
          <View style={styles.connectedActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={onShowShareQR}
            >
              <Ionicons name="share-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.disconnectButton]}
              onPress={onDisconnect}
            >
              <Ionicons name="log-out-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          isConnecting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.connectingButton]}
                disabled
              >
                <View style={styles.spinner} />
                <Text style={styles.buttonText}>Connecting...</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancelConnection}
              >
                <Ionicons name="close-circle-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={handleConnect}
            >
              <Ionicons name="wifi" size={20} color="white" />
              <Text style={styles.buttonText}>Connect</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card Styles
  mainCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.xl,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  inputLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingRight: 50,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
  },
  inputAction: {
    position: 'absolute',
    right: FreeShowTheme.spacing.sm,
    padding: FreeShowTheme.spacing.sm,
  },
  
  // Advanced Settings
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.md,
  },
  advancedText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
  },
  advancedSection: {
    marginTop: FreeShowTheme.spacing.md,
  },
  portGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.md,
  },
  portItem: {
    flex: 1,
    minWidth: '45%',
  },
  portLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portInput: {
    height: 40,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
  },
  
  // Action Buttons
  actionContainer: {
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.md,
    gap: FreeShowTheme.spacing.sm,
    minHeight: 48,
    flex: 1,
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  connectingButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: FreeShowTheme.colors.secondary + 'CC',
  },
  disconnectButton: {
    backgroundColor: FreeShowTheme.colors.disconnected,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: FreeShowTheme.colors.disconnected,
    marginLeft: FreeShowTheme.spacing.md,
  },
});

export default ConnectionForm;