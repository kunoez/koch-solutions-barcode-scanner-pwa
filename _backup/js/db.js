// IndexedDB Database Manager
class Database {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Scans store
                if (!db.objectStoreNames.contains(DB_CONFIG.STORES.SCANS)) {
                    const scansStore = db.createObjectStore(DB_CONFIG.STORES.SCANS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    scansStore.createIndex('barcode', 'barcode', { unique: false });
                    scansStore.createIndex('synced', 'synced', { unique: false });
                    scansStore.createIndex('date', 'date', { unique: false });
                }

                // Photos store
                if (!db.objectStoreNames.contains(DB_CONFIG.STORES.PHOTOS)) {
                    const photosStore = db.createObjectStore(DB_CONFIG.STORES.PHOTOS, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    photosStore.createIndex('scanId', 'scanId', { unique: false });
                }

                // Projects store
                if (!db.objectStoreNames.contains(DB_CONFIG.STORES.PROJECTS)) {
                    db.createObjectStore(DB_CONFIG.STORES.PROJECTS, {
                        keyPath: 'id'
                    });
                }

                // Offline data store
                if (!db.objectStoreNames.contains(DB_CONFIG.STORES.OFFLINE_DATA)) {
                    db.createObjectStore(DB_CONFIG.STORES.OFFLINE_DATA, {
                        keyPath: 'key'
                    });
                }
            };
        });
    }

    async addScan(scan) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.SCANS], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.SCANS);
            const request = store.add(scan);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateScan(id, updates) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.SCANS], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.SCANS);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const scan = getRequest.result;
                if (!scan) {
                    reject(new Error('Scan not found'));
                    return;
                }

                const updatedScan = { ...scan, ...updates };
                const updateRequest = store.put(updatedScan);

                updateRequest.onsuccess = () => resolve(updatedScan);
                updateRequest.onerror = () => reject(updateRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async getAllScans() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.SCANS], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.SCANS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingScans() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.SCANS], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.SCANS);
            const request = store.getAll();

            request.onsuccess = () => {
                // Filter for unsynced scans
                const pendingScans = request.result.filter(scan => scan.synced === false);
                resolve(pendingScans);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async addPhoto(photo) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.PHOTOS], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.PHOTOS);
            const request = store.add(photo);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPhotosByScanId(scanId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.PHOTOS], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.PHOTOS);
            const index = store.index('scanId');
            const request = index.getAll(scanId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveProjects(projects) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.PROJECTS], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.PROJECTS);

            // Clear existing projects
            store.clear();

            // Add new projects
            projects.forEach(project => {
                store.add(project);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getProjects() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.PROJECTS], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.PROJECTS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveOfflineData(key, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.OFFLINE_DATA], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.OFFLINE_DATA);
            const request = store.put({ key, data, timestamp: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getOfflineData(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([DB_CONFIG.STORES.OFFLINE_DATA], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.OFFLINE_DATA);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([
                DB_CONFIG.STORES.SCANS,
                DB_CONFIG.STORES.PHOTOS,
                DB_CONFIG.STORES.PROJECTS,
                DB_CONFIG.STORES.OFFLINE_DATA
            ], 'readwrite');

            transaction.objectStore(DB_CONFIG.STORES.SCANS).clear();
            transaction.objectStore(DB_CONFIG.STORES.PHOTOS).clear();
            transaction.objectStore(DB_CONFIG.STORES.PROJECTS).clear();
            transaction.objectStore(DB_CONFIG.STORES.OFFLINE_DATA).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Create singleton instance
const db = new Database();
