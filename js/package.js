// Package Scanning Manager
class PackageManager {
    constructor() {
        this.currentSession = null;
        this.scannedParts = [];
        this.expectedParts = [];
        this.damagePhotoManager = new PhotoManager();
    }

    // Generate unique client session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate unique client part ID
    generatePartId() {
        return 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Start a new package session
    async startSession(packageBarcode, location) {
        const sessionId = this.generateSessionId();

        this.currentSession = {
            clientSessionId: sessionId,
            packageBarcode,
            lat: location.lat.toString(),
            lng: location.lng.toString(),
            clientStartedAt: new Date().toISOString(),
            status: 'active',
            deviceInfo: navigator.userAgent,
            scannedParts: []
        };

        this.scannedParts = [];

        // Try to get package definition
        try {
            if (navigator.onLine) {
                const packageDef = await api.getPackageDefinitionByBarcode(packageBarcode);
                this.expectedParts = packageDef.parts || [];
            } else {
                // Try to load from offline data
                const offlineData = await db.getOfflineData('offlineData');
                if (offlineData && offlineData.packageDefinitions) {
                    const pkgDef = offlineData.packageDefinitions.find(p => p.packageBarcode === packageBarcode);
                    this.expectedParts = pkgDef ? [pkgDef] : [];
                }
            }
        } catch (error) {
            console.error('Failed to get package definition:', error);
            this.expectedParts = [];
        }

        // Save session to IndexedDB
        await this.saveSessionToDb();

        return this.currentSession;
    }

    // Scan a part
    async scanPart(partBarcode) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const partId = this.generatePartId();
        const scanOrder = this.scannedParts.length + 1;

        const part = {
            clientPartId: partId,
            partBarcode,
            clientScannedAt: new Date().toISOString(),
            scanOrder,
            status: 'normal',
            damageType: null,
            damageSeverity: null,
            damageNotes: null,
            photos: []
        };

        // Check if part is in expected parts
        const expectedPart = this.expectedParts.find(p => p.partBarcode === partBarcode);
        if (expectedPart) {
            part.partName = expectedPart.partName;
            part.expectedOrder = expectedPart.expectedOrder;
        }

        this.scannedParts.push(part);

        // Update session
        this.currentSession.scannedParts = this.scannedParts.map(p => ({
            clientPartId: p.clientPartId,
            partBarcode: p.partBarcode,
            clientScannedAt: p.clientScannedAt,
            scanOrder: p.scanOrder,
            status: p.status,
            damageType: p.damageType,
            damageSeverity: p.damageSeverity,
            damageNotes: p.damageNotes
        }));

        await this.saveSessionToDb();

        return part;
    }

    // Report damage on a part
    async reportDamage(partId, damageData, photos = []) {
        const partIndex = this.scannedParts.findIndex(p => p.clientPartId === partId);
        if (partIndex === -1) {
            throw new Error('Part not found');
        }

        this.scannedParts[partIndex] = {
            ...this.scannedParts[partIndex],
            status: 'damaged',
            damageType: damageData.damageType,
            damageSeverity: damageData.damageSeverity,
            damageNotes: damageData.damageNotes,
            photos: photos.map(p => ({
                blob: p.blob,
                dataUrl: p.dataUrl
            }))
        };

        // Update session
        this.currentSession.scannedParts = this.scannedParts.map(p => ({
            clientPartId: p.clientPartId,
            partBarcode: p.partBarcode,
            clientScannedAt: p.clientScannedAt,
            scanOrder: p.scanOrder,
            status: p.status,
            damageType: p.damageType,
            damageSeverity: p.damageSeverity,
            damageNotes: p.damageNotes
        }));

        await this.saveSessionToDb();

        return this.scannedParts[partIndex];
    }

    // Clear damage from a part
    async clearDamage(partId) {
        const partIndex = this.scannedParts.findIndex(p => p.clientPartId === partId);
        if (partIndex === -1) {
            throw new Error('Part not found');
        }

        this.scannedParts[partIndex] = {
            ...this.scannedParts[partIndex],
            status: 'normal',
            damageType: null,
            damageSeverity: null,
            damageNotes: null,
            photos: []
        };

        await this.saveSessionToDb();

        return this.scannedParts[partIndex];
    }

    // Complete the session
    async completeSession(storageLocation, notes = '') {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        this.currentSession.status = 'completed';
        this.currentSession.clientCompletedAt = new Date().toISOString();
        this.currentSession.storageLocation = storageLocation;
        this.currentSession.notes = notes;

        await this.saveSessionToDb();

        // Try to sync immediately
        if (navigator.onLine) {
            try {
                await this.syncSession();
            } catch (error) {
                console.error('Failed to sync session:', error);
            }
        }

        const completedSession = { ...this.currentSession };

        // Reset state
        this.currentSession = null;
        this.scannedParts = [];
        this.expectedParts = [];

        return completedSession;
    }

    // Cancel the session
    async cancelSession() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        this.currentSession.status = 'cancelled';

        await this.saveSessionToDb();

        // Reset state
        this.currentSession = null;
        this.scannedParts = [];
        this.expectedParts = [];
    }

    // Save session to IndexedDB
    async saveSessionToDb() {
        if (!this.currentSession) return;

        await db.saveOfflineData(
            `package_session_${this.currentSession.clientSessionId}`,
            {
                session: this.currentSession,
                scannedParts: this.scannedParts
            }
        );
    }

    // Sync session with server
    async syncSession() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const syncData = {
            sessions: [this.currentSession]
        };

        const response = await api.syncPackageSessions(syncData.sessions);

        // Sync damage photos
        for (const part of this.scannedParts) {
            if (part.status === 'damaged' && part.photos && part.photos.length > 0) {
                // Find server part ID from response
                const syncedPart = response.syncedParts?.find(
                    sp => sp.clientPartId === part.clientPartId
                );

                if (syncedPart && syncedPart.serverId) {
                    await api.reportPartDamage(
                        syncedPart.serverId,
                        {
                            damageType: part.damageType,
                            damageSeverity: part.damageSeverity,
                            damageNotes: part.damageNotes
                        },
                        part.photos
                    );
                }
            }
        }

        return response;
    }

    // Get unscanned parts
    getUnscannedParts() {
        const scannedBarcodes = this.scannedParts.map(p => p.partBarcode);
        return this.expectedParts.filter(p => !scannedBarcodes.includes(p.partBarcode));
    }

    // Get session progress
    getProgress() {
        if (!this.currentSession) return null;

        const total = this.expectedParts.length;
        const scanned = this.scannedParts.length;
        const damaged = this.scannedParts.filter(p => p.status === 'damaged').length;

        return {
            total,
            scanned,
            damaged,
            percentage: total > 0 ? Math.round((scanned / total) * 100) : 0
        };
    }

    // Check if there's an active session
    hasActiveSession() {
        return this.currentSession !== null;
    }
}

// Create singleton instance
const packageManager = new PackageManager();
