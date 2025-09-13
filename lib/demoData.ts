// Demo data for when Supabase is not configured

export const demoAlerts = [
  {
    id: '1',
    severity: 'high' as const,
    message: 'Water level at Leon Creek has reached 5.1 meters - Warning threshold exceeded',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: { lat: 29.4897, lng: -98.6125 }
  },
  {
    id: '2',
    severity: 'moderate' as const,
    message: 'Olmos Creek water level rising - Currently at 3.8 meters',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    location: { lat: 29.4589, lng: -98.4628 }
  },
  {
    id: '3',
    severity: 'low' as const,
    message: 'Medina River monitoring active - Water level at 2.2 meters',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    location: { lat: 29.3389, lng: -98.5481 }
  }
];

export const demoCrossings = [
  {
    id: '1',
    name: 'Josephine St Crossing',
    status: 'open' as const,
    water_level: 1.6,
    last_updated: new Date().toISOString(),
    coordinates: { lat: 29.4189, lng: -98.4875 }
  },
  {
    id: '2',
    name: 'Broadway at Hildebrand',
    status: 'warning' as const,
    water_level: 3.8,
    last_updated: new Date().toISOString(),
    coordinates: { lat: 29.4589, lng: -98.4628 }
  },
  {
    id: '3',
    name: 'Babcock Rd at Huebner Creek',
    status: 'closed' as const,
    water_level: 5.1,
    last_updated: new Date().toISOString(),
    coordinates: { lat: 29.4911, lng: -98.6089 }
  },
  {
    id: '4',
    name: 'Commerce St Bridge',
    status: 'open' as const,
    water_level: 1.6,
    last_updated: new Date().toISOString(),
    coordinates: { lat: 29.4241, lng: -98.4936 }
  },
  {
    id: '5',
    name: 'Culebra Rd at Alazan Creek',
    status: 'open' as const,
    water_level: 1.2,
    last_updated: new Date().toISOString(),
    coordinates: { lat: 29.4511, lng: -98.5456 }
  }
];

export const demoSensors = [
  {
    id: '1',
    name: 'San Antonio River at Mitchell St',
    water_level: 1.6,
    flow_rate: 58.7,
    status: 'normal' as const,
    coordinates: { lat: 29.4241, lng: -98.4936 }
  },
  {
    id: '2',
    name: 'San Pedro Creek at Houston St',
    water_level: 1.2,
    flow_rate: 30.1,
    status: 'normal' as const,
    coordinates: { lat: 29.4267, lng: -98.4989 }
  },
  {
    id: '3',
    name: 'Olmos Creek at Dresden Dr',
    water_level: 3.8,
    flow_rate: 105.3,
    status: 'elevated' as const,
    coordinates: { lat: 29.4589, lng: -98.4628 }
  },
  {
    id: '4',
    name: 'Medina River at San Antonio',
    water_level: 2.2,
    flow_rate: 71.8,
    status: 'normal' as const,
    coordinates: { lat: 29.3389, lng: -98.5481 }
  },
  {
    id: '5',
    name: 'Leon Creek at Loop 410',
    water_level: 5.1,
    flow_rate: 152.8,
    status: 'critical' as const,
    coordinates: { lat: 29.4897, lng: -98.6125 }
  }
];

export const demoReadings = [
  {
    sensor_id: '1',
    water_level: 1.2,
    flow_rate: 45.5,
    temperature: 22.3,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    sensor_id: '1',
    water_level: 1.3,
    flow_rate: 48.2,
    temperature: 22.1,
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  },
  {
    sensor_id: '1',
    water_level: 1.4,
    flow_rate: 52.1,
    temperature: 22.0,
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    sensor_id: '1',
    water_level: 1.5,
    flow_rate: 55.3,
    temperature: 21.8,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    sensor_id: '1',
    water_level: 1.6,
    flow_rate: 58.7,
    temperature: 21.5,
    timestamp: new Date().toISOString()
  }
];

// Function to simulate real-time updates
export function generateRandomReading(sensorId: string) {
  const baseLevel = Math.random() * 3 + 1;
  const variation = (Math.random() - 0.5) * 0.5;

  return {
    sensor_id: sensorId,
    water_level: Math.max(0, baseLevel + variation),
    flow_rate: Math.max(0, (baseLevel + variation) * 35 + Math.random() * 10),
    temperature: 20 + Math.random() * 5,
    timestamp: new Date().toISOString()
  };
}

// Simulate water level changes
export function updateDemoData() {
  // Randomly update a sensor's water level
  const sensorIndex = Math.floor(Math.random() * demoSensors.length);
  const sensor = demoSensors[sensorIndex];
  const change = (Math.random() - 0.5) * 0.5;

  sensor.water_level = Math.max(0, sensor.water_level + change);
  sensor.flow_rate = sensor.water_level * 35 + Math.random() * 10;

  // Update status based on water level
  if (sensor.water_level > 6) {
    sensor.status = 'critical';
  } else if (sensor.water_level > 3) {
    sensor.status = 'elevated';
  } else {
    sensor.status = 'normal';
  }

  // Update corresponding crossing if needed
  const crossing = demoCrossings.find(c =>
    Math.abs(c.coordinates.lat - sensor.coordinates.lat) < 0.01 &&
    Math.abs(c.coordinates.lng - sensor.coordinates.lng) < 0.01
  );

  if (crossing) {
    crossing.water_level = sensor.water_level;
    if (sensor.water_level > 5) {
      crossing.status = 'closed';
    } else if (sensor.water_level > 3) {
      crossing.status = 'warning';
    } else {
      crossing.status = 'open';
    }
    crossing.last_updated = new Date().toISOString();
  }

  // Potentially generate new alert
  if (sensor.water_level > 4 && Math.random() > 0.7) {
    const severity = sensor.water_level > 6 ? 'extreme' :
                    sensor.water_level > 5 ? 'high' :
                    sensor.water_level > 4 ? 'moderate' : 'low';

    demoAlerts.unshift({
      id: Date.now().toString(),
      severity: severity as any,
      message: `Water level at ${sensor.name} has reached ${sensor.water_level.toFixed(2)} meters`,
      created_at: new Date().toISOString(),
      location: sensor.coordinates
    });

    // Keep only recent alerts
    if (demoAlerts.length > 10) {
      demoAlerts.pop();
    }
  }
}