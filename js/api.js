// API Manager
class API {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
    }

    getHeaders(isMultipart = false) {
        const headers = {};

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.isMultipart),
                ...options.headers
            }
        };

        if (options.isMultipart) {
            delete config.isMultipart;
        }

        try {
            const response = await fetch(url, config);

            // Handle 401 - unauthorized
            if (response.status === 401) {
                this.setToken(null);
                window.dispatchEvent(new CustomEvent('auth:logout'));
                throw new Error('Unauthorized - please login again');
            }

            // Handle other errors
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || `HTTP error! status: ${response.status}`);
            }

            // Return response based on content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return response;
        } catch (error) {
            // If offline, throw specific error
            if (!navigator.onLine) {
                throw new Error('No internet connection');
            }
            throw error;
        }
    }

    // Authentication
    async login(email, password) {
        const response = await this.request('auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: email, password })
        });

        if (response.access_token) {
            this.setToken(response.access_token);
        }

        return response;
    }

    async getProfile() {
        return await this.request('auth/profile');
    }

    // Projects
    async getProjects() {
        return await this.request('projects');
    }

    // Scans
    async createScan(scanData, photos = []) {
        const formData = new FormData();
        formData.append('barcode', scanData.barcode);
        formData.append('lat', scanData.lat.toString());
        formData.append('lng', scanData.lng.toString());
        formData.append('comment', scanData.comment || '');

        if (scanData.date) {
            formData.append('date', new Date(scanData.date).toISOString());
        }

        // Add photos
        photos.forEach((photo, index) => {
            formData.append('images', photo.blob, `photo_${index}.jpg`);
        });

        return await this.request('scans', {
            method: 'POST',
            body: formData,
            isMultipart: true
        });
    }

    async getScan(barcode) {
        return await this.request(`scans/${barcode}`);
    }

    async getScanImages(barcode) {
        return await this.request(`scans/${barcode}/images`);
    }

    // Offline data
    async getOfflineData(projectIds = []) {
        const params = projectIds.map(id => `projectIds[]=${id}`).join('&');
        return await this.request(`data/offline-data?${params}`);
    }

    // Package definitions
    async getPackageDefinitions() {
        return await this.request('package-definitions');
    }

    async getPackageDefinitionByBarcode(barcode) {
        return await this.request(`package-definitions/${barcode}`);
    }

    // Package sessions
    async createPackageSession(sessionData) {
        return await this.request('package-sessions/create', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async completePackageSession(clientSessionId, data) {
        return await this.request(`package-sessions/${clientSessionId}/complete`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async syncPackageSessions(sessions) {
        return await this.request('package-sessions/sync', {
            method: 'POST',
            body: JSON.stringify({ sessions })
        });
    }

    // Scanned parts
    async scanPart(partData) {
        return await this.request('scanned-parts/scan', {
            method: 'POST',
            body: JSON.stringify(partData)
        });
    }

    async reportPartDamage(partId, damageData, photos = []) {
        const formData = new FormData();
        formData.append('damageType', damageData.damageType);
        formData.append('damageSeverity', damageData.damageSeverity);

        if (damageData.damageNotes) {
            formData.append('damageNotes', damageData.damageNotes);
        }

        // Add photos
        photos.forEach((photo, index) => {
            formData.append('images', photo.blob, `damage_${index}.jpg`);
        });

        return await this.request(`scanned-parts/${partId}/damage`, {
            method: 'POST',
            body: formData,
            isMultipart: true
        });
    }

    // Origins
    async getOrigins() {
        return await this.request('origins');
    }
}

// Create singleton instance
const api = new API();
