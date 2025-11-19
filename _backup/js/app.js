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
                ui.showTab('scan');
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

        // Package scanning
        document.getElementById('startPackageSessionBtn')?.addEventListener('click', () => {
            this.startPackageSession();
        });

        document.getElementById('scanPackageBarcodeBtn')?.addEventListener('click', () => {
            this.scanPackageBarcode();
        });

        document.getElementById('addPartBtn')?.addEventListener('click', () => {
            this.addPart();
        });

        document.getElementById('scanPartBtn')?.addEventListener('click', () => {
            this.scanPartBarcode();
        });

        document.getElementById('completeSessionBtn')?.addEventListener('click', () => {
            this.showCompleteSessionDialog();
        });

        document.getElementById('cancelSessionBtn')?.addEventListener('click', () => {
            this.cancelPackageSession();
        });

        // Damage dialog
        document.getElementById('closeDamageDialogBtn')?.addEventListener('click', () => {
            this.closeDamageDialog();
        });

        document.getElementById('cancelDamageBtn')?.addEventListener('click', () => {
            this.closeDamageDialog();
        });

        document.getElementById('saveDamageBtn')?.addEventListener('click', () => {
            this.saveDamage();
        });

        document.getElementById('addDamagePhotoBtn')?.addEventListener('click', () => {
            this.openPhotoCapture('damage');
        });

        // Complete session dialog
        document.getElementById('cancelCompleteBtn')?.addEventListener('click', () => {
            this.closeCompleteSessionDialog();
        });

        document.getElementById('confirmCompleteBtn')?.addEventListener('click', () => {
            this.confirmCompleteSession();
        });

        // Storage marker generator
        document.getElementById('generateMarkerBtn')?.addEventListener('click', () => {
            this.showStorageMarkerDialog('scan');
        });

        document.getElementById('generateManualMarkerBtn')?.addEventListener('click', () => {
            this.showStorageMarkerDialog('manual');
        });

        document.getElementById('closeMarkerDialogBtn')?.addEventListener('click', () => {
            this.closeStorageMarkerDialog();
        });

        document.getElementById('cancelMarkerBtn')?.addEventListener('click', () => {
            this.closeStorageMarkerDialog();
        });

        document.getElementById('applyMarkerBtn')?.addEventListener('click', () => {
            this.applyStorageMarker();
        });

        // Marker select change listeners
        ['markerSite', 'markerPosition', 'markerLocation', 'markerEquipment', 'markerEquipmentNumber'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.updateMarkerPreview();
            });
            document.getElementById(id)?.addEventListener('input', () => {
                this.updateMarkerPreview();
            });
        });

        // Load positions when site changes
        document.getElementById('markerSite')?.addEventListener('change', () => {
            this.loadPositionsForSite();
        });

        // Load equipment when location changes (for filtering by equipmentLocations)
        document.getElementById('markerLocation')?.addEventListener('change', () => {
            this.loadEquipmentForLocation();
        });
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

            // Handle both accessToken and access_token formats
            const token = response.accessToken || response.access_token;
            if (token) {
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
        ui.showTab('scan');

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
        let manager, gridId;

        if (type === 'scan') {
            manager = this.scanPhotoManager;
            gridId = 'photoGrid';
        } else if (type === 'manual') {
            manager = this.manualPhotoManager;
            gridId = 'manualPhotoGrid';
        } else if (type === 'damage') {
            manager = packageManager.damagePhotoManager;
            gridId = 'damagePhotoGrid';
        }

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

    // Package Scanning
    async startPackageSession() {
        const barcode = document.getElementById('packageBarcode').value.trim();

        if (!barcode) {
            ui.showToast('Package barcode is required', 'error');
            return;
        }

        // Get location
        try {
            await this.getCurrentLocation();
        } catch (error) {
            ui.showToast('Location is required to start session', 'error');
            return;
        }

        if (!this.currentLocation) {
            ui.showToast('Location is required to start session', 'error');
            return;
        }

        try {
            await packageManager.startSession(barcode, this.currentLocation);

            // Update UI
            document.getElementById('packageNoSession').style.display = 'none';
            document.getElementById('packageActiveSession').style.display = 'block';
            document.getElementById('activePackageBarcode').textContent = `Package: ${barcode}`;
            document.getElementById('packageBarcode').value = '';

            this.updatePackageProgress();
            this.renderScannedParts();

            ui.showToast('Session started', 'success');
        } catch (error) {
            console.error('Failed to start session:', error);
            ui.showToast('Failed to start session', 'error');
        }
    }

    async scanPackageBarcode() {
        // Use the same scanner for package barcodes
        try {
            const video = document.createElement('video');
            video.setAttribute('playsinline', '');

            await barcodeScanner.init(video, (barcode) => {
                document.getElementById('packageBarcode').value = barcode;
                barcodeScanner.stopScanning();
                ui.showToast('Package barcode scanned', 'success');
            });

            await barcodeScanner.startScanning();
        } catch (error) {
            ui.showToast(error.message, 'error');
        }
    }

    async addPart() {
        const barcode = document.getElementById('partBarcode').value.trim();

        if (!barcode) {
            ui.showToast('Part barcode is required', 'error');
            return;
        }

        try {
            await packageManager.scanPart(barcode);
            document.getElementById('partBarcode').value = '';

            this.updatePackageProgress();
            this.renderScannedParts();

            ui.showToast('Part added', 'success');
        } catch (error) {
            console.error('Failed to add part:', error);
            ui.showToast('Failed to add part', 'error');
        }
    }

    async scanPartBarcode() {
        try {
            const video = document.createElement('video');
            video.setAttribute('playsinline', '');

            await barcodeScanner.init(video, async (barcode) => {
                barcodeScanner.stopScanning();
                document.getElementById('partBarcode').value = barcode;
                await this.addPart();
            });

            await barcodeScanner.startScanning();
        } catch (error) {
            ui.showToast(error.message, 'error');
        }
    }

    updatePackageProgress() {
        const progress = packageManager.getProgress();

        if (progress) {
            document.getElementById('sessionProgress').textContent =
                `${progress.scanned}/${progress.total} parts scanned`;
            document.getElementById('sessionProgressBar').style.width =
                `${progress.percentage}%`;
        }
    }

    renderScannedParts() {
        const container = document.getElementById('scannedPartsList');
        const parts = packageManager.scannedParts;

        if (parts.length === 0) {
            container.innerHTML = '<p class="empty-text">No parts scanned yet</p>';
            return;
        }

        container.innerHTML = '';

        parts.forEach(part => {
            const item = document.createElement('div');
            item.className = 'part-item';

            const statusClass = part.status === 'damaged' ? 'damaged' : 'normal';
            const statusText = part.status === 'damaged' ? 'Damaged' : 'OK';

            item.innerHTML = `
                <div class="part-info">
                    <div class="part-barcode">${part.partBarcode}</div>
                    ${part.partName ? `<div class="part-name">${part.partName}</div>` : ''}
                </div>
                <div class="part-actions">
                    <span class="part-status ${statusClass}">${statusText}</span>
                    <button class="icon-btn-small damage" data-part-id="${part.clientPartId}" title="Report damage">
                        <i class="material-icons">report_problem</i>
                    </button>
                </div>
            `;

            // Add damage button listener
            item.querySelector('.damage').addEventListener('click', () => {
                this.showDamageDialog(part.clientPartId);
            });

            container.appendChild(item);
        });
    }

    // Damage Dialog
    currentDamagePartId = null;

    showDamageDialog(partId) {
        this.currentDamagePartId = partId;
        packageManager.damagePhotoManager.clear();

        // Reset form
        document.getElementById('damageType').value = '';
        document.getElementById('damageSeverity').value = '';
        document.getElementById('damageNotes').value = '';
        document.getElementById('damagePhotoGrid').innerHTML = '';

        document.getElementById('damageDialog').style.display = 'flex';
    }

    closeDamageDialog() {
        this.currentDamagePartId = null;
        packageManager.damagePhotoManager.clear();
        document.getElementById('damageDialog').style.display = 'none';
    }

    async saveDamage() {
        const damageType = document.getElementById('damageType').value;
        const damageSeverity = document.getElementById('damageSeverity').value;
        const damageNotes = document.getElementById('damageNotes').value;

        if (!damageType) {
            ui.showToast('Damage type is required', 'error');
            return;
        }

        if (!damageSeverity) {
            ui.showToast('Severity is required', 'error');
            return;
        }

        try {
            await packageManager.reportDamage(
                this.currentDamagePartId,
                { damageType, damageSeverity, damageNotes },
                packageManager.damagePhotoManager.getPhotos()
            );

            this.closeDamageDialog();
            this.renderScannedParts();

            ui.showToast('Damage reported', 'success');
        } catch (error) {
            console.error('Failed to report damage:', error);
            ui.showToast('Failed to report damage', 'error');
        }
    }

    // Complete Session
    showCompleteSessionDialog() {
        const unscanned = packageManager.getUnscannedParts();

        if (unscanned.length > 0) {
            document.getElementById('unscannedPartsWarning').style.display = 'block';
            const list = document.getElementById('unscannedPartsList');
            list.innerHTML = '<ul>' +
                unscanned.map(p => `<li>${p.partBarcode} - ${p.partName || 'Unknown'}</li>`).join('') +
                '</ul>';
        } else {
            document.getElementById('unscannedPartsWarning').style.display = 'none';
        }

        document.getElementById('sessionStorageLocation').value = '';
        document.getElementById('sessionNotes').value = '';
        document.getElementById('completeSessionDialog').style.display = 'flex';
    }

    closeCompleteSessionDialog() {
        document.getElementById('completeSessionDialog').style.display = 'none';
    }

    async confirmCompleteSession() {
        const storageLocation = document.getElementById('sessionStorageLocation').value.trim();
        const notes = document.getElementById('sessionNotes').value.trim();

        if (!storageLocation) {
            ui.showToast('Storage location is required', 'error');
            return;
        }

        try {
            await packageManager.completeSession(storageLocation, notes);

            this.closeCompleteSessionDialog();

            // Reset UI
            document.getElementById('packageNoSession').style.display = 'block';
            document.getElementById('packageActiveSession').style.display = 'none';
            document.getElementById('scannedPartsList').innerHTML = '<p class="empty-text">No parts scanned yet</p>';

            ui.showToast('Session completed successfully', 'success');
        } catch (error) {
            console.error('Failed to complete session:', error);
            ui.showToast('Failed to complete session', 'error');
        }
    }

    async cancelPackageSession() {
        const confirmed = await ui.confirm(
            'Cancel Session',
            'Are you sure you want to cancel this session? All scanned data will be lost.'
        );

        if (!confirmed) return;

        try {
            await packageManager.cancelSession();

            // Reset UI
            document.getElementById('packageNoSession').style.display = 'block';
            document.getElementById('packageActiveSession').style.display = 'none';
            document.getElementById('scannedPartsList').innerHTML = '<p class="empty-text">No parts scanned yet</p>';

            ui.showToast('Session cancelled', 'warning');
        } catch (error) {
            console.error('Failed to cancel session:', error);
            ui.showToast('Failed to cancel session', 'error');
        }
    }

    // Storage Marker Generator
    markerTargetType = null;
    offlineData = null;

    async showStorageMarkerDialog(targetType) {
        this.markerTargetType = targetType;

        // Load offline data if not loaded
        if (!this.offlineData) {
            await this.loadMarkerData();
        }

        // Reset form
        document.getElementById('markerSite').value = '';
        document.getElementById('markerPosition').innerHTML = '<option value="">Select position...</option>';
        document.getElementById('markerLocation').value = '';
        document.getElementById('markerEquipment').value = '';
        document.getElementById('markerEquipmentNumber').value = '';

        this.updateMarkerPreview();

        document.getElementById('storageMarkerDialog').style.display = 'flex';
    }

    closeStorageMarkerDialog() {
        document.getElementById('storageMarkerDialog').style.display = 'none';
        this.markerTargetType = null;
    }

    async loadMarkerData() {
        try {
            // Try to get from IndexedDB first
            this.offlineData = await db.getOfflineData('offlineData');

            // If not available, fetch from API
            if (!this.offlineData && navigator.onLine) {
                const projectIds = this.selectedProject ? [this.selectedProject.projectId] : [];
                this.offlineData = await api.getOfflineData(projectIds);
                await db.saveOfflineData('offlineData', this.offlineData);
            }

            if (!this.offlineData) {
                ui.showToast('Please sync offline data first', 'warning');
                return;
            }

            // Populate sites
            const siteSelect = document.getElementById('markerSite');
            siteSelect.innerHTML = '<option value="">Select site...</option>';
            if (this.offlineData.sites) {
                this.offlineData.sites.forEach(site => {
                    const option = document.createElement('option');
                    option.value = site.code;
                    option.textContent = `${site.code} - ${site.name}`;
                    option.dataset.id = site.id;
                    siteSelect.appendChild(option);
                });
            }

            // Populate locations
            const locationSelect = document.getElementById('markerLocation');
            locationSelect.innerHTML = '<option value="">Select location...</option>';
            if (this.offlineData.locations) {
                this.offlineData.locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.code;
                    option.textContent = `${location.code} - ${location.name}`;
                    option.dataset.id = location.id;
                    locationSelect.appendChild(option);
                });
            }

            // Populate equipment
            const equipmentSelect = document.getElementById('markerEquipment');
            equipmentSelect.innerHTML = '<option value="">Select equipment...</option>';
            if (this.offlineData.equipments) {
                this.offlineData.equipments.forEach(equipment => {
                    const option = document.createElement('option');
                    option.value = equipment.code;
                    option.textContent = equipment.name ? `${equipment.code} - ${equipment.name}` : equipment.code;
                    option.dataset.id = equipment.id;
                    equipmentSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Failed to load marker data:', error);
            ui.showToast('Failed to load data for marker generation', 'error');
        }
    }

    loadPositionsForSite() {
        const siteSelect = document.getElementById('markerSite');
        const positionSelect = document.getElementById('markerPosition');

        positionSelect.innerHTML = '<option value="">Select position...</option>';

        if (!this.offlineData || !this.offlineData.positions) return;

        const selectedOption = siteSelect.selectedOptions[0];
        if (!selectedOption || !selectedOption.dataset.id) return;

        const siteId = parseInt(selectedOption.dataset.id);

        // Filter positions by site
        const sitePositions = this.offlineData.positions.filter(p => p.siteId === siteId);

        sitePositions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.number;
            option.textContent = position.number;
            positionSelect.appendChild(option);
        });

        this.updateMarkerPreview();
    }

    loadEquipmentForLocation() {
        // This could filter equipment based on equipmentLocations if needed
        // For now, we show all equipment
        this.updateMarkerPreview();
    }

    updateMarkerPreview() {
        const site = document.getElementById('markerSite').value;
        const position = document.getElementById('markerPosition').value;
        const location = document.getElementById('markerLocation').value;
        const equipment = document.getElementById('markerEquipment').value;
        const equipmentNumber = document.getElementById('markerEquipmentNumber').value;

        const preview = document.getElementById('markerPreview');

        // Build marker string
        const parts = [];

        if (site) parts.push(site);
        if (position) parts.push(position);
        if (location) parts.push(location);
        if (equipment) parts.push(equipment);
        if (equipmentNumber) parts.push(equipmentNumber);

        if (parts.length > 0) {
            preview.textContent = parts.join('-');
            preview.classList.remove('placeholder');
        } else {
            preview.textContent = 'Storage marker will be generated automatically...';
            preview.classList.add('placeholder');
        }
    }

    applyStorageMarker() {
        const preview = document.getElementById('markerPreview').textContent;

        if (preview === 'Storage marker will be generated automatically...') {
            ui.showToast('Please select at least one option', 'error');
            return;
        }

        // Apply to the correct input based on target type
        if (this.markerTargetType === 'scan') {
            document.getElementById('scanComment').value = preview;
        } else if (this.markerTargetType === 'manual') {
            document.getElementById('manualComment').value = preview;
        }

        this.closeStorageMarkerDialog();
        ui.showToast('Storage marker applied', 'success');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
