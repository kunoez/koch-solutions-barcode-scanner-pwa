// Main Application
class App {
    constructor() {
        this.currentLocation = null;
        this.manualLocation = null;
        this.selectedProject = null;
        this.scanPhotoManager = new PhotoManager();
        this.manualPhotoManager = new PhotoManager();
        this.init();
    }

    async init() {
        try {
            // Initialize database
            await db.init();

            // Check authentication state
            await this.checkAuth();

            // Setup event listeners
            this.setupEventListeners();

            // Setup network status monitoring
            this.setupNetworkMonitoring();

            // Update sync badge
            await this.updateSyncStatus();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization error:', error);
            ui.showToast('Failed to initialize app', 'error');
        }
    }

    async checkAuth() {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

        if (!token) {
            ui.showScreen('login');
            return;
        }

        // Validate token by getting profile
        try {
            await api.getProfile();

            // Load selected project
            const projectData = localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
            if (projectData) {
                this.selectedProject = JSON.parse(projectData);
                ui.showScreen('main');
                await this.loadScans();
            } else {
                // No project selected, show project selection
                ui.showScreen('project');
                await this.loadProjects();
            }
        } catch (error) {
            console.error('Auth validation failed:', error);
            ui.showScreen('login');
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                ui.showTab(tab);

                // Load scans when view tab is activated
                if (tab === 'view') {
                    this.loadScans();
                }
            });
        });

        // Scanner
        document.getElementById('startScanBtn').addEventListener('click', () => {
            this.startScanner();
        });

        document.getElementById('clearScanBtn').addEventListener('click', () => {
            ui.clearScanForm('scan');
            this.scanPhotoManager.clear();
        });

        document.getElementById('submitScanBtn').addEventListener('click', () => {
            this.submitScan();
        });

        // Manual entry
        document.getElementById('clearManualBtn').addEventListener('click', () => {
            ui.clearScanForm('manual');
            this.manualPhotoManager.clear();
        });

        document.getElementById('submitManualBtn').addEventListener('click', () => {
            this.submitManualScan();
        });

        // Photo buttons
        document.getElementById('addPhotoBtn').addEventListener('click', () => {
            this.openPhotoCapture('scan');
        });

        document.getElementById('addManualPhotoBtn').addEventListener('click', () => {
            this.openPhotoCapture('manual');
        });

        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handlePhotoSelected(e);
        });

        // Location buttons
        document.getElementById('editLocationBtn').addEventListener('click', () => {
            this.editLocation('scan');
        });

        document.getElementById('editManualLocationBtn').addEventListener('click', () => {
            this.editLocation('manual');
        });

        // Menu
        document.getElementById('menuBtn').addEventListener('click', () => {
            ui.showMenu();
        });

        document.getElementById('closeMenuBtn').addEventListener('click', () => {
            ui.hideMenu();
        });

        document.querySelector('.menu-backdrop')?.addEventListener('click', () => {
            ui.hideMenu();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('changeProjectBtn').addEventListener('click', () => {
            ui.hideMenu();
            this.changeProject();
        });

        document.getElementById('syncOfflineDataBtn').addEventListener('click', () => {
            ui.hideMenu();
            this.syncOfflineData();
        });

        // Sync buttons
        document.getElementById('syncBtn').addEventListener('click', () => {
            this.syncPendingScans();
        });

        document.getElementById('syncNowBtn').addEventListener('click', () => {
            this.syncPendingScans();
        });

        document.getElementById('refreshProjectsBtn')?.addEventListener('click', () => {
            this.loadProjects();
        });

        // Custom events
        window.addEventListener('project:selected', (e) => {
            this.handleProjectSelected(e.detail);
        });

        window.addEventListener('auth:logout', () => {
            this.handleLogout();
        });

        // Service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_SCANS') {
                    this.syncPendingScans();
                }
            });
        }
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            ui.updateNetworkStatus(true);
            ui.showToast('Back online', 'success');
            this.syncPendingScans();
        });

        window.addEventListener('offline', () => {
            ui.updateNetworkStatus(false);
            ui.showToast('You are offline', 'warning');
        });

        // Initial status
        ui.updateNetworkStatus(navigator.onLine);
    }

    // Authentication
    async handleLogin() {
        ui.clearErrors();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Validation
        if (!email) {
            ui.showError('emailError', 'Email is required');
            return;
        }

        if (!password) {
            ui.showError('passwordError', 'Password is required');
            return;
        }

        const loginBtn = document.getElementById('loginBtn');
        ui.setButtonLoading(loginBtn, true);

        try {
            const response = await api.login(email, password);

            if (response.access_token) {
                ui.showToast('Login successful', 'success');

                // Load projects
                ui.showScreen('project');
                await this.loadProjects();
            }
        } catch (error) {
            console.error('Login error:', error);
            ui.showError('loginError', error.message || 'Login failed. Please try again.');
            document.getElementById('loginError').style.display = 'block';
        } finally {
            ui.setButtonLoading(loginBtn, false);
        }
    }

    async handleLogout() {
        const confirmed = await ui.confirm(
            'Sign Out',
            'Are you sure you want to sign out? All unsynchronized data will be lost.'
        );

        if (!confirmed) return;

        try {
            // Clear data
            api.setToken(null);
            localStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT);
            await db.clearAll();

            // Reset state
            this.selectedProject = null;
            this.scanPhotoManager.clear();
            this.manualPhotoManager.clear();

            // Show login screen
            ui.showScreen('login');
            ui.showToast('Signed out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            ui.showToast('Error signing out', 'error');
        }
    }

    // Projects
    async loadProjects() {
        try {
            const projects = await api.getProjects();
            await db.saveProjects(projects);
            ui.renderProjects(projects);
        } catch (error) {
            console.error('Failed to load projects:', error);

            // Try to load from cache
            const cachedProjects = await db.getProjects();
            if (cachedProjects.length > 0) {
                ui.renderProjects(cachedProjects);
                ui.showToast('Showing cached projects', 'warning');
            } else {
                ui.showToast('Failed to load projects', 'error');
            }
        }
    }

    async handleProjectSelected(project) {
        this.selectedProject = project;
        localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, JSON.stringify(project));

        ui.showToast(`Project selected: ${project.name}`, 'success');
        ui.showScreen('main');

        // Get location for scan tab
        this.getCurrentLocation();

        // Load scans
        await this.loadScans();
    }

    async changeProject() {
        ui.showScreen('project');
        await this.loadProjects();
    }

    async syncOfflineData() {
        if (!navigator.onLine) {
            ui.showToast('Cannot sync offline data while offline', 'error');
            return;
        }

        try {
            ui.showToast('Syncing offline data...', 'default');

            const projectIds = this.selectedProject ? [this.selectedProject.projectId] : [];
            const offlineData = await api.getOfflineData(projectIds);

            await db.saveOfflineData('offlineData', offlineData);

            ui.showToast('Offline data synchronized successfully', 'success');
        } catch (error) {
            console.error('Failed to sync offline data:', error);
            ui.showToast('Failed to sync offline data', 'error');
        }
    }

    // Scanner
    async startScanner() {
        try {
            const video = document.getElementById('scannerVideo');
            const videoContainer = document.getElementById('videoContainer');
            const placeholder = document.querySelector('.scanner-placeholder');
            const startBtn = document.getElementById('startScanBtn');

            // Hide placeholder and button
            placeholder.style.display = 'none';
            startBtn.style.display = 'none';
            videoContainer.style.display = 'block';

            // Initialize scanner
            await barcodeScanner.init(video, (barcode) => {
                this.handleBarcodeScanned(barcode);
            });

            // Start scanning
            await barcodeScanner.startScanning();
        } catch (error) {
            console.error('Scanner error:', error);
            ui.showToast(error.message, 'error');

            // Reset UI
            document.querySelector('.scanner-placeholder').style.display = 'flex';
            document.getElementById('startScanBtn').style.display = 'flex';
            document.getElementById('videoContainer').style.display = 'none';
        }
    }

    async handleBarcodeScanned(barcode) {
        console.log('Barcode scanned:', barcode);

        // Show scan data form
        document.getElementById('scannedBarcode').value = barcode;
        document.getElementById('scanDataForm').style.display = 'block';

        // Hide video
        document.getElementById('videoContainer').style.display = 'none';
        document.querySelector('.scanner-placeholder').style.display = 'flex';

        // Get current location
        await this.getCurrentLocation();

        ui.showToast('Barcode scanned successfully', 'success');
    }

    async getCurrentLocation() {
        try {
            ui.updateLocationDisplay(null, 'locationText');

            const location = await locationManager.getCurrentLocation();
            this.currentLocation = location;

            ui.updateLocationDisplay(location, 'locationText');
        } catch (error) {
            console.error('Location error:', error);
            ui.showToast(error.message, 'warning');

            const locationText = document.getElementById('locationText');
            if (locationText) {
                locationText.innerHTML = `
                    <i class="material-icons">location_off</i>
                    <span>Location unavailable</span>
                `;
            }
        }

        // Also get location for manual tab
        try {
            const location = await locationManager.getCurrentLocation();
            this.manualLocation = location;
            ui.updateLocationDisplay(location, 'manualLocationText');
        } catch (error) {
            // Silent fail for manual location
        }
    }

    editLocation(type) {
        const currentLoc = type === 'scan' ? this.currentLocation : this.manualLocation;

        const newLat = prompt('Enter latitude:', currentLoc?.lat || '');
        const newLng = prompt('Enter longitude:', currentLoc?.lng || '');

        if (newLat && newLng) {
            const location = {
                lat: parseFloat(newLat),
                lng: parseFloat(newLng)
            };

            if (type === 'scan') {
                this.currentLocation = location;
                ui.updateLocationDisplay(location, 'locationText');
            } else {
                this.manualLocation = location;
                ui.updateLocationDisplay(location, 'manualLocationText');
            }
        }
    }

    // Photos
    openPhotoCapture(type) {
        const input = document.getElementById('photoInput');
        input.dataset.type = type;
        input.click();
    }

    async handlePhotoSelected(event) {
        const files = event.target.files;
        if (!files.length) return;

        const type = event.target.dataset.type;
        const manager = type === 'scan' ? this.scanPhotoManager : this.manualPhotoManager;
        const gridId = type === 'scan' ? 'photoGrid' : 'manualPhotoGrid';

        try {
            for (let file of files) {
                // Compress image
                const compressed = await manager.compressImage(file);
                await manager.addPhoto(compressed);
            }

            ui.renderPhotoGrid(manager.getPhotos(), gridId, (photoId) => {
                manager.removePhoto(photoId);
                ui.renderPhotoGrid(manager.getPhotos(), gridId, (id) => this.handlePhotoRemove(id, type));
            });

            ui.showToast(`${files.length} photo(s) added`, 'success');
        } catch (error) {
            console.error('Photo error:', error);
            ui.showToast(error.message, 'error');
        }

        // Reset input
        event.target.value = '';
    }

    handlePhotoRemove(photoId, type) {
        const manager = type === 'scan' ? this.scanPhotoManager : this.manualPhotoManager;
        const gridId = type === 'scan' ? 'photoGrid' : 'manualPhotoGrid';

        manager.removePhoto(photoId);
        ui.renderPhotoGrid(manager.getPhotos(), gridId, (id) => this.handlePhotoRemove(id, type));
    }

    // Submit Scan
    async submitScan() {
        const barcode = document.getElementById('scannedBarcode').value;
        const comment = document.getElementById('scanComment').value.trim();

        if (!barcode) {
            ui.showToast('No barcode scanned', 'error');
            return;
        }

        if (!comment) {
            ui.showToast('Storage marker is required', 'error');
            return;
        }

        if (!this.currentLocation) {
            ui.showToast('Location is required', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitScanBtn');
        ui.setButtonLoading(submitBtn, true);

        try {
            const scanData = {
                barcode,
                lat: this.currentLocation.lat,
                lng: this.currentLocation.lng,
                comment,
                date: Date.now(),
                synced: false,
                photoCount: this.scanPhotoManager.getCount()
            };

            // Save to IndexedDB
            const scanId = await db.addScan(scanData);

            // Save photos
            const photos = this.scanPhotoManager.getPhotos();
            for (let photo of photos) {
                await db.addPhoto({
                    scanId,
                    blob: photo.blob,
                    timestamp: photo.timestamp
                });
            }

            // Try to sync immediately if online
            if (navigator.onLine) {
                try {
                    await api.createScan(scanData, photos);

                    // Mark as synced
                    await db.updateScan(scanId, { synced: true });

                    ui.showToast('Scan saved and synchronized', 'success');
                } catch (error) {
                    console.error('Sync error:', error);
                    ui.showToast('Scan saved offline, will sync later', 'warning');
                }
            } else {
                ui.showToast('Scan saved offline, will sync when online', 'warning');
            }

            // Clear form
            ui.clearScanForm('scan');
            this.scanPhotoManager.clear();

            // Update sync status
            await this.updateSyncStatus();
        } catch (error) {
            console.error('Submit scan error:', error);
            ui.showToast('Failed to save scan', 'error');
        } finally {
            ui.setButtonLoading(submitBtn, false);
        }
    }

    async submitManualScan() {
        const barcode = document.getElementById('manualBarcode').value.trim();
        const comment = document.getElementById('manualComment').value.trim();

        if (!barcode) {
            ui.showToast('Barcode is required', 'error');
            return;
        }

        if (!comment) {
            ui.showToast('Storage marker is required', 'error');
            return;
        }

        if (!this.manualLocation) {
            ui.showToast('Location is required', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitManualBtn');
        ui.setButtonLoading(submitBtn, true);

        try {
            const scanData = {
                barcode,
                lat: this.manualLocation.lat,
                lng: this.manualLocation.lng,
                comment,
                date: Date.now(),
                synced: false,
                photoCount: this.manualPhotoManager.getCount()
            };

            // Save to IndexedDB
            const scanId = await db.addScan(scanData);

            // Save photos
            const photos = this.manualPhotoManager.getPhotos();
            for (let photo of photos) {
                await db.addPhoto({
                    scanId,
                    blob: photo.blob,
                    timestamp: photo.timestamp
                });
            }

            // Try to sync immediately if online
            if (navigator.onLine) {
                try {
                    await api.createScan(scanData, photos);

                    // Mark as synced
                    await db.updateScan(scanId, { synced: true });

                    ui.showToast('Manual scan saved and synchronized', 'success');
                } catch (error) {
                    console.error('Sync error:', error);
                    ui.showToast('Manual scan saved offline, will sync later', 'warning');
                }
            } else {
                ui.showToast('Manual scan saved offline, will sync when online', 'warning');
            }

            // Clear form
            ui.clearScanForm('manual');
            this.manualPhotoManager.clear();

            // Update sync status
            await this.updateSyncStatus();
        } catch (error) {
            console.error('Submit manual scan error:', error);
            ui.showToast('Failed to save manual scan', 'error');
        } finally {
            ui.setButtonLoading(submitBtn, false);
        }
    }

    // Sync
    async syncPendingScans() {
        if (!navigator.onLine) {
            ui.showToast('Cannot sync while offline', 'warning');
            return;
        }

        try {
            const pendingScans = await db.getPendingScans();

            if (pendingScans.length === 0) {
                ui.showToast('No scans to sync', 'default');
                return;
            }

            ui.showToast(`Syncing ${pendingScans.length} scan(s)...`, 'default');

            let successCount = 0;
            let failCount = 0;

            for (let scan of pendingScans) {
                try {
                    // Get photos for this scan
                    const photos = await db.getPhotosByScanId(scan.id);

                    // Upload scan
                    await api.createScan(scan, photos);

                    // Mark as synced
                    await db.updateScan(scan.id, { synced: true });

                    successCount++;
                } catch (error) {
                    console.error('Failed to sync scan:', scan.barcode, error);
                    failCount++;
                }
            }

            if (successCount > 0) {
                ui.showToast(`Synced ${successCount} scan(s) successfully`, 'success');
            }

            if (failCount > 0) {
                ui.showToast(`Failed to sync ${failCount} scan(s)`, 'error');
            }

            // Update sync status
            await this.updateSyncStatus();

            // Reload scans list
            await this.loadScans();
        } catch (error) {
            console.error('Sync error:', error);
            ui.showToast('Sync failed', 'error');
        }
    }

    async updateSyncStatus() {
        try {
            const pendingScans = await db.getPendingScans();
            ui.updateSyncBadge(pendingScans.length);
        } catch (error) {
            console.error('Failed to update sync status:', error);
        }
    }

    // View Scans
    async loadScans() {
        try {
            const scans = await db.getAllScans();
            ui.renderScans(scans);
        } catch (error) {
            console.error('Failed to load scans:', error);
            ui.showToast('Failed to load scans', 'error');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
