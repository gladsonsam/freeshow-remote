# FreeShow Companion App

A mobile companion app for FreeShow presentation software, built with React Native and Expo.

## Features

- 🎮 **Remote Control**: Control your FreeShow presentations remotely
  - Next/Previous slide navigation
  - Play/Pause/Stop controls
  - Real-time slide tracking

- 📱 **Mobile & Tablet Support**: Optimized for both phone and tablet devices

- 🔗 **Easy Connection**: Simple WiFi connection setup to your FreeShow instance

- 📋 **Show Management**: View and manage your presentations (coming soon)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- FreeShow installed on your computer
- Both devices on the same WiFi network

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
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

4. Use the Expo Go app on your mobile device to scan the QR code

### Connecting to FreeShow

1. Make sure FreeShow is running on your computer
2. Note your computer's IP address
3. In the app, go to the "Connect" tab
4. Enter your computer's IP address and port (default: 3001)
5. Tap "Connect"

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # App screens
│   ├── ConnectScreen.tsx    # Connection setup
│   ├── RemoteScreen.tsx     # Remote control interface
│   └── ShowsScreen.tsx      # Show management
├── services/           # Business logic
│   └── FreeShowService.ts   # FreeShow WebSocket communication
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Technologies Used

- **React Native & Expo**: Cross-platform mobile development
- **TypeScript**: Type-safe JavaScript
- **Socket.IO**: Real-time WebSocket communication
- **React Navigation**: Navigation between screens
- **Expo Vector Icons**: Beautiful icons

## Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start on Android emulator/device
- `npm run ios` - Start on iOS simulator/device
- `npm run web` - Start web version

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
