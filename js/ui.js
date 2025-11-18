// UI Manager
class UIManager {
    constructor() {
        this.currentScreen = 'login';
        this.currentTab = 'scan';
        this.toastTimeout = null;
    }

    // Screen Management
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const screen = document.getElementById(screenId + 'Screen');
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    // Tab Management
    showTab(tabId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId + 'Tab')?.classList.add('active');

        this.currentTab = tabId;
    }

    // Toast Notifications
    showToast(message, type = 'default', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');

        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    }

    // Loading States
    setButtonLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        if (isLoading) {
            button.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';
        } else {
            button.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    // Error Display
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = message ? 'block' : 'none';
        }
    }

    clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        document.querySelectorAll('.error-banner').forEach(el => {
            el.style.display = 'none';
        });
    }

    // Network Status
    updateNetworkStatus(isOnline) {
        const indicator = document.getElementById('offlineIndicator');
        if (indicator) {
            indicator.style.display = isOnline ? 'none' : 'flex';
        }
    }

    // Sync Badge
    updateSyncBadge(count) {
        const badge = document.getElementById('syncBadge');
        const banner = document.getElementById('syncBanner');
        const bannerText = document.getElementById('syncBannerText');

        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (banner && bannerText) {
            if (count > 0) {
                bannerText.textContent = `${count} scan${count > 1 ? 's' : ''} waiting to sync`;
                banner.style.display = 'flex';
            } else {
                banner.style.display = 'none';
            }
        }
    }

    // Photo Grid
    renderPhotoGrid(photos, gridId, onRemove) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        grid.innerHTML = '';

        photos.forEach(photo => {
            const item = document.createElement('div');
            item.className = 'photo-item';

            const img = document.createElement('img');
            img.src = photo.dataUrl;
            img.alt = 'Captured photo';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'photo-remove';
            removeBtn.innerHTML = '<i class="material-icons">close</i>';
            removeBtn.onclick = () => onRemove(photo.id);

            item.appendChild(img);
            item.appendChild(removeBtn);
            grid.appendChild(item);
        });

        // Update photo count label
        const label = grid.parentElement.querySelector('label');
        if (label) {
            label.textContent = `Photos (${photos.length}/${CONFIG.MAX_PHOTOS})`;
        }
    }

    // Location Display
    updateLocationDisplay(location, elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (location) {
            element.innerHTML = `
                <i class="material-icons">my_location</i>
                <span>${locationManager.formatLocation(location)}</span>
            `;
        } else {
            element.innerHTML = `
                <i class="material-icons">location_searching</i>
                <span>Getting location...</span>
            `;
        }
    }

    // Projects List
    renderProjects(projects) {
        const container = document.getElementById('projectsList');
        if (!container) return;

        container.innerHTML = '';

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">folder_off</i>
                    <p>No projects available</p>
                    <p class="small">Please contact your administrator</p>
                    <button class="btn btn-outlined mt-16" id="retryProjectsBtn">
                        <i class="material-icons">refresh</i>
                        Retry
                    </button>
                </div>
            `;
            return;
        }

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.projectId = project.id;

            card.innerHTML = `
                <h3>${project.name}</h3>
                <p><strong>Company:</strong> ${project.company}</p>
                <p><strong>Project ID:</strong> ${project.projectId}</p>
                <p><strong>Code:</strong> ${project.code}</p>
            `;

            card.onclick = () => {
                window.dispatchEvent(new CustomEvent('project:selected', {
                    detail: project
                }));
            };

            container.appendChild(card);
        });
    }

    // Scans List
    renderScans(scans) {
        const container = document.getElementById('scansList');
        if (!container) return;

        container.innerHTML = '';

        if (scans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons">qr_code_2</i>
                    <p>No scans yet</p>
                    <p class="small">Your scanned data will appear here</p>
                </div>
            `;
            return;
        }

        // Sort by date descending
        scans.sort((a, b) => b.date - a.date);

        scans.forEach(scan => {
            const card = document.createElement('div');
            card.className = 'scan-card';

            const date = new Date(scan.date);
            const syncStatus = scan.synced ? 'synced' : 'pending';
            const syncLabel = scan.synced ? 'Synced' : 'Pending';

            card.innerHTML = `
                <div class="scan-card-header">
                    <div>
                        <h3>${scan.barcode}</h3>
                        <div class="scan-card-date">${date.toLocaleString()}</div>
                    </div>
                    <span class="sync-status ${syncStatus}">${syncLabel}</span>
                </div>
                <div class="scan-card-info">
                    <div class="scan-card-row">
                        <i class="material-icons">location_on</i>
                        <span>${locationManager.formatLocation({ lat: parseFloat(scan.lat), lng: parseFloat(scan.lng) })}</span>
                    </div>
                    ${scan.comment ? `
                        <div class="scan-card-row">
                            <i class="material-icons">comment</i>
                            <span><strong>Marker:</strong> ${scan.comment}</span>
                        </div>
                    ` : ''}
                    ${scan.photoCount > 0 ? `
                        <div class="scan-card-row">
                            <i class="material-icons">photo</i>
                            <span><strong>Photos:</strong> ${scan.photoCount}</span>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Menu Overlay
    showMenu() {
        const overlay = document.getElementById('menuOverlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }

    hideMenu() {
        const overlay = document.getElementById('menuOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Confirmation Dialog
    confirm(title, message) {
        return new Promise((resolve) => {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    // Clear Form
    clearScanForm(formType = 'scan') {
        const prefix = formType === 'scan' ? 'scan' : 'manual';

        const barcodeInput = document.getElementById(`${prefix}${formType === 'scan' ? 'ned' : ''}Barcode`);
        const commentInput = document.getElementById(`${prefix}Comment`);

        if (barcodeInput) barcodeInput.value = '';
        if (commentInput) commentInput.value = '';

        // Clear photos
        photoManager.clear();
        this.renderPhotoGrid([], `${prefix}PhotoGrid`, () => {});

        // Hide form if scan type
        if (formType === 'scan') {
            document.getElementById('scanDataForm').style.display = 'none';
            document.getElementById('startScanBtn').style.display = 'flex';
        }
    }
}

// Create singleton instance
const ui = new UIManager();
