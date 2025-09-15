// Texas Geo Configuration for RiverAlert MVP
export const TexasGeoConfig = {
  // Texas bounding box
  bbox: {
    north: 36.5007,
    south: 25.8371,
    east: -93.5164,
    west: -106.6456
  },

  // County centroids and key info
  counties: {
    bexar: {
      name: 'Bexar County',
      center: { lat: 29.4246, lng: -98.4951 },
      population: 2048290,
      riskLevel: 'high',
      lowWaterCrossings: 226,
      majorRivers: ['San Antonio River', 'Medina River', 'Salado Creek'],
      floodZones: ['Leon Valley', 'Helotes', 'Castle Hills', 'Alamo Heights']
    },
    kerr: {
      name: 'Kerr County',
      center: { lat: 30.0476, lng: -99.1403 },
      population: 52598,
      riskLevel: 'critical',
      lowWaterCrossings: 47,
      majorRivers: ['Guadalupe River', 'North Fork Guadalupe', 'Johnson Creek'],
      floodZones: ['Kerrville', 'Ingram', 'Hunt', 'Center Point']
    },
    travis: {
      name: 'Travis County',
      center: { lat: 30.2672, lng: -97.7431 },
      population: 1290188,
      riskLevel: 'high',
      lowWaterCrossings: 189,
      majorRivers: ['Colorado River', 'Onion Creek', 'Barton Creek'],
      floodZones: ['Austin', 'Pflugerville', 'Manor', 'Del Valle']
    },
    harris: {
      name: 'Harris County',
      center: { lat: 29.7604, lng: -95.3698 },
      population: 4731145,
      riskLevel: 'extreme',
      lowWaterCrossings: 312,
      majorRivers: ['Buffalo Bayou', 'San Jacinto River', 'Clear Creek'],
      floodZones: ['Houston', 'Pasadena', 'Baytown', 'Spring Valley']
    },
    dallas: {
      name: 'Dallas County',
      center: { lat: 32.7767, lng: -96.7970 },
      population: 2613539,
      riskLevel: 'moderate',
      lowWaterCrossings: 143,
      majorRivers: ['Trinity River', 'White Rock Creek', 'Elm Fork'],
      floodZones: ['Dallas', 'Irving', 'Garland', 'Mesquite']
    }
  },

  // Pilot zones for demo
  pilotZones: {
    bexarLowWater: {
      name: 'Bexar County Low-Water Crossings',
      type: 'critical_infrastructure',
      coordinates: [
        { lat: 29.5051, lng: -98.4016, name: 'Huebner Creek at Vance Jackson' },
        { lat: 29.4432, lng: -98.6189, name: 'Helotes Creek at Scenic Loop' },
        { lat: 29.3829, lng: -98.4537, name: 'San Pedro Creek at Probandt' },
        { lat: 29.5464, lng: -98.3892, name: 'Salado Creek at Eisenhauer' }
      ]
    },
    kerrvilleGuadalupe: {
      name: 'Kerrville Guadalupe River Sites',
      type: 'river_monitoring',
      coordinates: [
        { lat: 30.0508, lng: -99.1406, name: 'Guadalupe River at Kerrville' },
        { lat: 30.0672, lng: -99.1623, name: 'Town Creek at Junction Hwy' },
        { lat: 30.0394, lng: -99.1139, name: 'Guadalupe at River Hills' },
        { lat: 30.0812, lng: -99.1812, name: 'North Fork at Ingram' }
      ]
    }
  },

  // Target audience descriptor
  targetAudience: {
    primary: [
      'Public residents in flood-prone areas',
      'Emergency operations centers',
      'River Authority stakeholders',
      'Local government agencies'
    ],
    secondary: [
      'School districts and administrators',
      'Healthcare facilities',
      'Transportation departments',
      'First responders'
    ],
    messaging: {
      public: 'Protecting families with real-time flood alerts and safe evacuation routes',
      government: 'Comprehensive flood monitoring and predictive analytics for emergency management',
      schools: 'Automated district-wide alerts for student safety during flood events'
    }
  },

  // Map defaults for demo
  mapDefaults: {
    center: { lat: 29.8833, lng: -98.8183 }, // Between Bexar and Kerr
    zoom: 9,
    minZoom: 7,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors | RiverAlert Texas MVP'
  },

  // Risk thresholds (feet above normal)
  riskThresholds: {
    none: { min: 0, max: 2, color: '#10b981' },
    low: { min: 2, max: 5, color: '#eab308' },
    moderate: { min: 5, max: 10, color: '#f97316' },
    high: { min: 10, max: 15, color: '#ef4444' },
    extreme: { min: 15, max: null, color: '#7c2d12' }
  },

  // Alert zones by type
  zoneTypes: {
    school: {
      icon: '🏫',
      priority: 1,
      notificationChannels: ['sms', 'email', 'app', 'voice'],
      leadTime: 120 // minutes
    },
    emergency: {
      icon: '🚨',
      priority: 0,
      notificationChannels: ['all'],
      leadTime: 60
    },
    residential: {
      icon: '🏘️',
      priority: 2,
      notificationChannels: ['app', 'sms'],
      leadTime: 90
    },
    commercial: {
      icon: '🏢',
      priority: 3,
      notificationChannels: ['email', 'app'],
      leadTime: 90
    }
  },

  // USGS station IDs for Texas
  usgsStations: {
    bexar: ['08178050', '08178565', '08181480'],
    kerr: ['08166200', '08167000', '08167500'],
    travis: ['08154700', '08155200', '08155300'],
    harris: ['08073600', '08074000', '08075000'],
    dallas: ['08057410', '08061540', '08062500']
  }
}

export default TexasGeoConfig