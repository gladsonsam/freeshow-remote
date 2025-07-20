# FreeShow Companion

A mobile companion app for [FreeShow](https://freeshow.app) presentation software, built with React Native and Expo.

## Features

- 📱 **QR Code Connection**: Scan QR codes from FreeShow to connect instantly
- 🎮 **Remote Control**: Control your FreeShow presentations remotely
  - Next/Previous slide navigation
  - Clear slide/background/all
  - Restore output
- 📋 **Show Management**: 
  - View all available shows
  - Switch between shows dynamically
  - Browse show content and slides
- �️ **Output Display**: View FreeShow's output screen in a WebView with:
  - Full-screen mode
  - Screen rotation controls for output
  - Real-time content display
- 📱 **Cross-Platform**: Works on both Android and iOS devices
- � **Real-time Sync**: Socket.IO connection for instant updates
- 🎨 **Native UI**: Custom themed interface matching FreeShow's design

## Screenshots

<!-- Add screenshots here when available -->

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g @expo/eas-cli`) for building APK/IPA
- FreeShow installed on your computer with API enabled
- Both devices on the same WiFi network

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gladsonsam/freeshow-companion.git
cd freeshow-companion
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Use the Expo Go app on your mobile device to scan the QR code, or build a standalone app

### Building APK/IPA

For a standalone app that works without Expo Go:

```bash
# Build Android APK
eas build --platform android --profile preview

# Build iOS app
eas build --platform ios --profile preview
```

### Connecting to FreeShow

1. Make sure FreeShow is running on your computer with API enabled
2. In FreeShow, enable the Remote API (typically runs on port 5505)
3. Use one of these methods to connect:

**Method 1: QR Code (Recommended)**
1. In FreeShow, display the connection QR code
2. In the app, tap "Scan QR Code"
3. Point your camera at the QR code

**Method 2: Manual Connection**
1. Note your computer's IP address
2. In the app, tap "Manual Connection"
3. Enter your computer's IP address
4. Tap "Connect"

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── QRScannerModal.tsx      # QR code scanning
│   ├── ShareQRModal.tsx        # Share connection QR
│   └── ShowSwitcher.tsx        # Show selection dropdown
├── contexts/               # React contexts
│   ├── ConnectionContext.tsx   # Connection state management
│   └── ThemeContext.tsx        # App theming
├── screens/               # App screens
│   ├── ConnectScreen.tsx       # Connection setup
│   ├── RemoteScreen.tsx        # Remote control interface
│   ├── ShowSelectorScreen.tsx  # Show selection
│   └── WebViewScreen.tsx       # FreeShow output display
├── services/              # Business logic
│   ├── FreeShowService.ts      # FreeShow API communication
│   └── SettingsService.ts      # App settings persistence
├── theme/                 # App styling
│   └── FreeShowTheme.ts        # Theme definitions
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```
## Technologies Used

- **React Native & Expo**: Cross-platform mobile development
- **TypeScript**: Type-safe JavaScript
- **Socket.IO**: Real-time WebSocket communication with FreeShow
- **React Navigation**: Navigation between screens
- **Expo Camera**: QR code scanning functionality
- **React Native WebView**: Display FreeShow output
- **Expo Vector Icons**: Beautiful icons
- **AsyncStorage**: Local data persistence

## Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start on Android emulator/device
- `npm run ios` - Start on iOS simulator/device
- `npm run web` - Start web version
- `eas build --platform android --profile preview` - Build Android APK
- `eas build --platform ios --profile preview` - Build iOS app

## FreeShow API Integration

This app integrates with FreeShow's Socket.IO API and supports:

- **Connection Management**: Establish WebSocket connection to FreeShow
- **Show Control**: Get shows, select shows, navigate slides
- **Output Control**: Clear operations, restore output
- **Real-time Updates**: Live sync with FreeShow state
- **Multiple Transport**: WebSocket with polling fallback for reliability

## Troubleshooting

### Connection Issues
- Ensure both devices are on the same WiFi network
- Check that FreeShow's API is enabled (usually port 5505)
- Verify firewall settings aren't blocking connections
- For APK builds, HTTP connections are enabled via network security config

### Build Issues
- Run `npx expo install --fix` to resolve dependency conflicts
- Run `npx expo-doctor` to check for configuration issues
- Use `eas build --clear-cache` if builds fail

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FreeShow](https://freeshow.app) - The amazing presentation software this app connects to
- Expo team for the excellent development platform
- React Native community for the robust mobile framework
