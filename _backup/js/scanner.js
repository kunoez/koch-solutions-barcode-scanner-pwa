// Barcode Scanner using ZXing library
class BarcodeScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.video = null;
        this.codeReader = null;
        this.onScanCallback = null;
    }

    async init(videoElement, onScan) {
        this.video = videoElement;
        this.onScanCallback = onScan;

        // Load ZXing library dynamically
        if (!window.ZXing) {
            await this.loadZXingLibrary();
        }

        return true;
    }

    async loadZXingLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async startScanning() {
        if (this.isScanning) return;

        try {
            // Request camera permission
            this.stream = await navigator.mediaDevices.getUserMedia(CONFIG.CAMERA_CONSTRAINTS);
            this.video.srcObject = this.stream;
            this.video.play();

            // Initialize ZXing code reader
            const codeReader = new ZXing.BrowserMultiFormatReader();
            this.codeReader = codeReader;

            this.isScanning = true;

            // Start decoding
            codeReader.decodeFromVideoDevice(
                undefined, // Use default camera
                this.video,
                (result, error) => {
                    if (result) {
                        this.handleScan(result.text);
                    }
                    // Ignore errors during scanning (they occur when no barcode is in view)
                }
            );

            return true;
        } catch (error) {
            console.error('Error starting scanner:', error);

            // Fallback to manual barcode entry if camera fails
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access to scan barcodes.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please use manual entry.');
            } else {
                throw new Error('Failed to start camera: ' + error.message);
            }
        }
    }

    handleScan(barcode) {
        if (!this.isScanning) return;

        // Stop scanning temporarily to process result
        this.stopScanning();

        // Call the callback with the scanned barcode
        if (this.onScanCallback) {
            this.onScanCallback(barcode);
        }
    }

    stopScanning() {
        this.isScanning = false;

        if (this.codeReader) {
            this.codeReader.reset();
            this.codeReader = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }
    }

    async capturePhoto() {
        if (!this.video || !this.stream) {
            throw new Error('Camera not active');
        }

        // Create canvas to capture current frame
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        const context = canvas.getContext('2d');
        context.drawImage(this.video, 0, 0);

        // Convert to blob
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve({
                            blob,
                            dataUrl: canvas.toDataURL('image/jpeg', 0.8)
                        });
                    } else {
                        reject(new Error('Failed to capture photo'));
                    }
                },
                'image/jpeg',
                0.8
            );
        });
    }
}

// Photo Manager
class PhotoManager {
    constructor() {
        this.photos = [];
        this.maxPhotos = CONFIG.MAX_PHOTOS;
    }

    async addPhoto(file) {
        if (this.photos.length >= this.maxPhotos) {
            throw new Error(`Maximum ${this.maxPhotos} photos allowed`);
        }

        // Convert file to data URL for preview
        const dataUrl = await this.fileToDataUrl(file);

        const photo = {
            id: Date.now() + Math.random(),
            blob: file,
            dataUrl,
            timestamp: Date.now()
        };

        this.photos.push(photo);
        return photo;
    }

    removePhoto(photoId) {
        this.photos = this.photos.filter(p => p.id !== photoId);
    }

    getPhotos() {
        return this.photos;
    }

    clear() {
        this.photos = [];
    }

    getCount() {
        return this.photos.length;
    }

    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                }));
                            } else {
                                reject(new Error('Image compression failed'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// Create singleton instances
const barcodeScanner = new BarcodeScanner();
const photoManager = new PhotoManager();
