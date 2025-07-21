# FreeShow Remote

A mobile remote app for [FreeShow](https://freeshow.app) presentation software, built with React Native and Expo.

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
git clone https://github.com/gladsonsam/freeshow-remote.git
cd freeshow-remote
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
- `eas build --platform android --profile preview` - Build Android APK
- `eas build --platform ios --profile preview` - Build iOS app


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
