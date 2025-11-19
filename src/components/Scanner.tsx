"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flashlight, FlashlightOff, Camera, X } from "lucide-react";

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
  continuous?: boolean;
}

export function Scanner({ onScan, onClose, continuous = true }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const handleScan = useCallback(
    (barcode: string) => {
      const now = Date.now();
      // Debounce: ignore same barcode within 2 seconds
      if (barcode === lastScanned && now - lastScanTimeRef.current < 2000) {
        return;
      }

      lastScanTimeRef.current = now;
      setLastScanned(barcode);
      setScanCount((prev) => prev + 1);
      triggerHaptic();
      onScan(barcode);

      if (!continuous) {
        stopScanning();
      }
    },
    [lastScanned, continuous, onScan, stopScanning, triggerHaptic]
  );

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX,
      ]);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Check for torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      setHasTorch(!!capabilities.torch);

      setIsScanning(true);

      reader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScan(result.getText());
          }
          if (error && error.name !== "NotFoundException") {
            // Ignore not found errors during continuous scanning
          }
        }
      );
    } catch (error) {
      console.error("Failed to start scanner:", error);
    }
  }, [handleScan]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        // @ts-expect-error torch is not in standard types
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (error) {
      console.error("Failed to toggle torch:", error);
    }
  }, [torchOn]);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, [startScanning, stopScanning]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Scanning Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Dark overlay with transparent center */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-transparent border-2 border-white/50 rounded-lg">
            {/* Corner markers */}
            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary animate-scan" />
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {scanCount > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                {scanCount} scanned
              </Badge>
            )}
            {lastScanned && (
              <span className="text-xs text-white/70 truncate max-w-32">
                {lastScanned}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasTorch && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTorch}
                className="text-white hover:bg-white/20"
              >
                {torchOn ? (
                  <FlashlightOff className="h-5 w-5" />
                ) : (
                  <Flashlight className="h-5 w-5" />
                )}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  stopScanning();
                  onClose();
                }}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Top info bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-2">
          <Camera className="h-4 w-4 text-white/70" />
          <span className="text-sm text-white/70">
            {continuous ? "Continuous scanning" : "Single scan mode"}
          </span>
        </div>
      </div>

      {/* Scan success flash */}
      {lastScanned && (
        <div className="absolute inset-0 bg-green-500/20 animate-flash pointer-events-none" />
      )}
    </div>
  );
}
