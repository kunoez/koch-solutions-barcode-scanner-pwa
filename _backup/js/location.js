// Location Manager
class LocationManager {
    constructor() {
        this.currentLocation = null;
        this.watchId = null;
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    resolve(this.currentLocation);
                },
                (error) => {
                    let errorMessage = 'Failed to get location';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                    }

                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: CONFIG.LOCATION_TIMEOUT,
                    maximumAge: CONFIG.LOCATION_MAX_AGE
                }
            );
        });
    }

    startWatching(callback) {
        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                if (callback) {
                    callback(this.currentLocation);
                }
            },
            (error) => {
                console.error('Error watching location:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: CONFIG.LOCATION_MAX_AGE
            }
        );
    }

    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    formatLocation(location) {
        if (!location) return 'Location not available';

        return `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
    }

    getDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula to calculate distance between two coordinates
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }
}

// Create singleton instance
const locationManager = new LocationManager();
