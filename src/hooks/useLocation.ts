"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store";

export function useLocation() {
  const { currentLocation, setCurrentLocation } = useAppStore();

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [setCurrentLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location: currentLocation,
    requestLocation,
  };
}
