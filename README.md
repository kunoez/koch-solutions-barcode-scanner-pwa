# Koch Solutions Barcode Scanner PWA

A Progressive Web App (PWA) for barcode scanning with offline-first capabilities, GPS location tracking, and photo capture. This app replicates all functionality from the native Android Kotlin version.

## Features

### Core Functionality
- **Barcode Scanning**: Real-time barcode scanning using device camera with ZXing library
- **GPS Location Tracking**: Automatic location capture with manual editing capability
- **Photo Capture**: Up to 10 photos per scan with automatic compression
- **Offline-First Architecture**: All operations work without internet connection
- **Background Sync**: Automatic synchronization when connectivity is restored
- **JWT Authentication**: Secure token-based authentication

### User Features
- **Scan Tab**: Camera-based barcode scanning with live preview
- **Manual Tab**: Manual barcode entry for devices without camera or when scanning fails
- **Package Tab**: Package definition tracking with parts scanning (ready for implementation)
- **View Tab**: Browse all scanned items with sync status
- **Project Selection**: Mandatory project selection before scanning
- **Storage Markers**: Required metadata for each scan

### Technical Features
- **Service Worker**: Offline caching and background sync
- **IndexedDB**: Local database for offline data persistence
- **Material Design**: Clean, mobile-first UI following Material Design 2 guidelines
- **Responsive Design**: Works on all screen sizes
- **Progressive Enhancement**: Works on modern browsers with graceful degradation

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Barcode Scanning**: ZXing library
- **Database**: IndexedDB for client-side storage
- **Service Worker**: For offline functionality and caching
- **API Integration**: RESTful API with JWT authentication
- **Design**: Material Design 2

## API Integration

The PWA connects to the same backend as the Android app:

**Base URL**: `https://barcode-api.koch-solutions.com/`

### Endpoints Used

#### Authentication
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile

#### Scans
- `POST /scans` - Create new scan (multipart/form-data)
- `GET /scans/{barcode}` - Get scan by barcode
- `GET /scans/{barcode}/images` - Get scan images

#### Projects
- `GET /projects` - Get all projects

#### Offline Data
- `GET /data/offline-data` - Get offline data for sync

#### Package Features (Ready for Implementation)
- `GET /package-definitions` - Get package definitions
- `GET /package-definitions/{packageBarcode}` - Get package parts
- `POST /package-sessions/create` - Create package session
- `POST /package-sessions/sync` - Sync package sessions
- `POST /scanned-parts/scan` - Scan part
- `POST /scanned-parts/{id}/damage` - Report part damage

## Installation

### Prerequisites
- Modern web browser with JavaScript enabled
- HTTPS connection (required for camera and geolocation APIs)
- Internet connection for initial setup

### Deployment Options

#### Option 1: Static Hosting (Recommended)
Deploy to any static hosting service:

```bash
# Netlify
netlify deploy --prod

# Vercel
vercel --prod

# GitHub Pages
# Push to gh-pages branch or configure in repository settings

# Firebase Hosting
firebase deploy
```

#### Option 2: Local Development Server

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000`

#### Option 3: HTTPS for Camera Access

For camera access in development, you need HTTPS:

```bash
# Using local-web-server
npx local-web-server --https -p 8000

# Or use ngrok to tunnel
npx ngrok http 8000
```

### Adding to Home Screen

1. Open the app in a mobile browser
2. Tap the browser menu
3. Select "Add to Home Screen"
4. The app will install as a standalone application

## Usage

### First-Time Setup

1. **Login**
   - Enter your email and password
   - Credentials are the same as the Android app

2. **Select Project**
   - Choose a project from the list
   - This is required before scanning

3. **Grant Permissions**
   - Allow camera access for barcode scanning
   - Allow location access for GPS tracking

### Scanning Barcodes

**Camera Scan:**
1. Go to the "Scan" tab
2. Tap "Start Scanner"
3. Point camera at barcode
4. Scanner will automatically detect and scan
5. Enter storage marker (required)
6. Add photos if needed (optional, up to 10)
7. Tap "Submit"

**Manual Entry:**
1. Go to the "Manual" tab
2. Type barcode manually
3. Edit location if needed
4. Enter storage marker (required)
5. Add photos if needed (optional)
6. Tap "Submit"

### Offline Usage

The app works fully offline:

- All scans are saved locally
- Photos are stored in IndexedDB
- Sync happens automatically when online
- Sync badge shows pending items count

### Syncing Data

**Automatic Sync:**
- Happens when you go back online
- Background sync when app is closed

**Manual Sync:**
- Tap the sync icon in the top bar
- Or tap "Sync Now" in the banner

## Project Structure

```
koch-solutions-barcode-scanner-pwa/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   └── styles.css         # Material Design styles
├── js/
│   ├── config.js          # Configuration
│   ├── db.js              # IndexedDB manager
│   ├── api.js             # API integration
│   ├── scanner.js         # Barcode scanner & photo manager
│   ├── location.js        # GPS location manager
│   ├── ui.js              # UI manager
│   └── app.js             # Main application logic
├── icons/                 # PWA icons (multiple sizes)
└── README.md              # This file
```

## Browser Support

### Fully Supported
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- Samsung Internet 14+

### Required APIs
- Service Worker
- IndexedDB
- Geolocation API
- Media Devices API (camera)
- Fetch API
- ES6+ JavaScript

### Recommended
- Android 8.0+ or iOS 14+
- Modern mobile browser
- HTTPS connection

## Development

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/kunoez/koch-solutions-barcode-scanner-pwa.git
cd koch-solutions-barcode-scanner-pwa
```

2. Start a local HTTPS server (required for camera):
```bash
npx local-web-server --https -p 8000
```

3. Open in browser:
```
https://localhost:8000
```

### Testing

**Manual Testing Checklist:**
- [ ] Login/logout flow
- [ ] Project selection
- [ ] Camera barcode scanning
- [ ] Manual barcode entry
- [ ] Photo capture and compression
- [ ] GPS location tracking
- [ ] Location editing
- [ ] Offline mode
- [ ] Sync functionality
- [ ] View scanned items
- [ ] PWA installation

### Future Enhancements

- [ ] Package scanning implementation
- [ ] Damage reporting with photos
- [ ] Advanced search and filtering
- [ ] Export scans to CSV/Excel
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Barcode format selection
- [ ] Bulk operations
- [ ] Analytics dashboard

## Troubleshooting

### Camera Not Working
- Ensure HTTPS connection
- Grant camera permissions
- Check browser compatibility
- Try manual entry as fallback

### Location Not Working
- Grant location permissions
- Enable GPS on device
- Check browser location settings
- Use manual location editing

### Sync Issues
- Check internet connection
- Verify API endpoint is accessible
- Check authentication token validity
- Review browser console for errors

### PWA Installation Issues
- Use HTTPS connection
- Clear browser cache
- Check manifest.json validity
- Try different browser

## API Endpoint Configuration

To change the API endpoint, edit `/js/config.js`:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-api-url.com/',
    // ... other config
};
```

## Security

- JWT tokens stored in localStorage
- HTTPS required for production
- Camera/location permissions required
- No sensitive data in service worker cache
- API authentication on all requests

## License

Copyright © 2024 Koch Solutions GmbH. All rights reserved.

## Support

For issues, questions, or feature requests, please contact:
- Email: support@koch-solutions.com
- Website: https://koch-solutions.com

## Changelog

### Version 1.0.0 (2024)
- Initial PWA release
- Barcode scanning with camera
- GPS location tracking
- Photo capture up to 10 images
- Offline-first architecture
- Background sync
- Material Design UI
- Project selection
- JWT authentication
