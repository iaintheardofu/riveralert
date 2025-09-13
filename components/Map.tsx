'use client';

import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  sensors?: any[];
  crossings?: any[];
  alerts?: any[];
}

export default function Map({ sensors = [], crossings = [], alerts = [] }: MapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [markersLayer, setMarkersLayer] = useState<L.LayerGroup | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Fix for default marker icons in Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Initialize map
    const mapInstance = L.map('map').setView([29.4241, -98.4936], 11); // San Antonio coordinates

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    // Create markers layer group
    const markers = L.layerGroup().addTo(mapInstance);

    setMap(mapInstance);
    setMarkersLayer(markers);

    return () => {
      mapInstance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    // Add sensor markers
    sensors.forEach(sensor => {
      if (sensor.coordinates) {
        const icon = L.divIcon({
          html: `<div class="${getSensorIconClass(sensor.status)}"></div>`,
          iconSize: [20, 20],
          className: 'custom-div-icon'
        });

        const marker = L.marker([sensor.coordinates.lat, sensor.coordinates.lng], { icon })
          .bindPopup(`
            <strong>${sensor.name}</strong><br>
            Status: ${sensor.status}<br>
            Water Level: ${sensor.water_level.toFixed(2)} ft<br>
            Flow Rate: ${sensor.flow_rate.toFixed(2)} cfs
          `);
        markersLayer.addLayer(marker);
      }
    });

    // Add crossing markers
    crossings.forEach(crossing => {
      if (crossing.coordinates) {
        const icon = L.divIcon({
          html: `<div class="${getCrossingIconClass(crossing.status)}"></div>`,
          iconSize: [24, 24],
          className: 'custom-div-icon'
        });

        const marker = L.marker([crossing.coordinates.lat, crossing.coordinates.lng], { icon })
          .bindPopup(`
            <strong>${crossing.name}</strong><br>
            Status: ${crossing.status}<br>
            Water Level: ${crossing.water_level.toFixed(2)} ft
          `);
        markersLayer.addLayer(marker);
      }
    });

    // Add alert markers
    alerts.forEach(alert => {
      if (alert.location) {
        const icon = L.divIcon({
          html: `<div class="${getAlertIconClass(alert.severity)}"></div>`,
          iconSize: [30, 30],
          className: 'custom-div-icon'
        });

        const marker = L.marker([alert.location.lat, alert.location.lng], { icon })
          .bindPopup(`
            <strong>${alert.severity.toUpperCase()} Alert</strong><br>
            ${alert.message}<br>
            <small>${new Date(alert.created_at).toLocaleString()}</small>
          `);
        markersLayer.addLayer(marker);
      }
    });
  }, [map, markersLayer, sensors, crossings, alerts]);

  return (
    <>
      <div id="map" className="w-full h-full rounded-lg" />
      <style jsx global>{`
        .custom-div-icon {
          background: transparent;
          border: none;
        }
        
        /* Sensor icons */
        .sensor-normal {
          width: 20px;
          height: 20px;
          background: #10b981;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .sensor-elevated {
          width: 20px;
          height: 20px;
          background: #f59e0b;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .sensor-critical {
          width: 20px;
          height: 20px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          animation: pulse 2s infinite;
        }
        
        /* Crossing icons */
        .crossing-open {
          width: 24px;
          height: 24px;
          background: #10b981;
          border: 2px solid white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .crossing-warning {
          width: 24px;
          height: 24px;
          background: #f59e0b;
          border: 2px solid white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .crossing-closed {
          width: 24px;
          height: 24px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          animation: pulse 2s infinite;
        }
        
        /* Alert icons */
        .alert-low {
          width: 30px;
          height: 30px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .alert-moderate {
          width: 30px;
          height: 30px;
          background: #eab308;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .alert-high {
          width: 30px;
          height: 30px;
          background: #f97316;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        }
        
        .alert-extreme {
          width: 30px;
          height: 30px;
          background: #dc2626;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

function getSensorIconClass(status: string): string {
  switch (status) {
    case 'critical': return 'sensor-critical';
    case 'elevated': return 'sensor-elevated';
    default: return 'sensor-normal';
  }
}

function getCrossingIconClass(status: string): string {
  switch (status) {
    case 'closed': return 'crossing-closed';
    case 'warning': return 'crossing-warning';
    default: return 'crossing-open';
  }
}

function getAlertIconClass(severity: string): string {
  switch (severity) {
    case 'extreme': return 'alert-extreme';
    case 'high': return 'alert-high';
    case 'moderate': return 'alert-moderate';
    default: return 'alert-low';
  }
}