// Configuration
const CONFIG = {
    API_BASE_URL: 'https://barcode-api.koch-solutions.com/',
    MAX_PHOTOS: 10,
    CAMERA_CONSTRAINTS: {
        video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    },
    BARCODE_SCANNER_CONFIG: {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    },
    SYNC_RETRY_ATTEMPTS: 3,
    SYNC_RETRY_DELAY: 2000,
    LOCATION_TIMEOUT: 10000,
    LOCATION_MAX_AGE: 30000
};

// Storage Keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    SELECTED_PROJECT: 'selected_project',
    PENDING_SCANS: 'pending_scans',
    LAST_SYNC: 'last_sync'
};

// Database Configuration
const DB_CONFIG = {
    NAME: 'BarcodeScanner',
    VERSION: 1,
    STORES: {
        SCANS: 'scans',
        PHOTOS: 'photos',
        PROJECTS: 'projects',
        OFFLINE_DATA: 'offline_data'
    }
};
