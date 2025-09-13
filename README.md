# RiverAlert - Real-Time Flood Intelligence Platform

[![CI/CD Pipeline](https://github.com/theaicowboys/riveralert/actions/workflows/ci.yml/badge.svg)](https://github.com/theaicowboys/riveralert/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Preventing tragedies like Kerrville through real-time flood intelligence**

RiverAlert is a comprehensive flood monitoring and alert system developed by The AI Cowboys. Following the devastating July 4, 2025 Kerrville flood that claimed 135 lives, RiverAlert provides the critical infrastructure needed to deliver life-saving alerts in under 60 seconds.

## 🎯 Key Features

- **Real-Time Monitoring**: 30-second data updates from IoT sensors, USGS, and NOAA
- **Intelligent Alerts**: AI-powered risk assessment with multi-channel distribution
- **Safe Navigation**: Automatic routing around flooded areas via OpenRouteService/Google Maps
- **Community Engagement**: Crowdsourced validation and bilingual support
- **Offline Support**: Critical data cached for connectivity loss
- **Universal Access**: Web, iOS, Android, SMS, and API access

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL with PostGIS extension
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/theaicowboys/riveralert.git
cd riveralert

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start services with Docker
docker compose up -d

# Run database migrations
pnpm run db:migrate

# Seed demo data (includes Kerrville incident)
pnpm run db:seed

# Start development servers
pnpm run dev
```

### Access Points

- Web Dashboard: http://localhost:3000
- API Documentation: http://localhost:3001/docs
- Admin Panel: http://localhost:3000/admin

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Maps**: Leaflet + OpenStreetMap (default), Google Maps (optional)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15 with PostGIS
- **Realtime**: Supabase Realtime
- **Queue**: BullMQ with Redis
- **Mobile**: React Native with Expo
- **Infrastructure**: Docker, GitHub Actions, Vercel/Fly.io

### Project Structure

```
riveralert/
├── apps/
│   ├── api/          # Backend API server
│   ├── web/          # Next.js web application
│   └── mobile/       # React Native mobile app
├── packages/
│   ├── ui/           # Shared UI components
│   ├── sdk/          # TypeScript SDK
│   └── config/       # Shared configurations
├── supabase/
│   ├── schema.sql    # Database schema
│   ├── policies.sql  # Row-level security
│   └── seeds.sql     # Demo data (Kerrville incident)
├── docs/
│   ├── research/     # API integration docs
│   └── proposal/     # Grant proposal documents
└── docker-compose.yml
```

## 🔌 API Integrations

RiverAlert integrates with multiple free/public APIs:

### Hydrology & Weather
- **USGS Water Services**: Real-time water levels (15-60 min updates)
- **NOAA/NWS Weather API**: Alerts and forecasts
- **Open-Meteo**: Backup weather data

### Mapping & Routing
- **OpenStreetMap/Nominatim**: Geocoding (1 req/sec limit)
- **OpenRouteService**: Safe routing (2000 req/day free)
- **Waze**: Deep links for navigation

### Additional Services
- **FEMA NFHL**: Flood hazard zones
- **OpenFEMA**: Disaster declarations
- **Firebase Cloud Messaging**: Push notifications

See [/docs/research/integrations.md](./docs/research/integrations.md) for complete API documentation.

## 📊 Kerrville Use Case

On July 4, 2025, the Guadalupe River at Kerrville rose 26 feet in 45 minutes. Despite 22 NWS alerts, Kerr County never activated wireless emergency alerts, resulting in 135 fatalities.

### Demo Data
The database includes real Kerrville flood timeline data:
- Location: Guadalupe River at Hunt (29.3356°N, 99.0703°W)
- Peak level: 37 feet (normal: 2.5 feet)
- Timeline: 3:00 AM - 7:00 AM progression

```sql
-- View Kerrville incident data
SELECT * FROM readings
WHERE sensor_id = (SELECT id FROM sensors WHERE external_id = 'SNS-001')
AND timestamp BETWEEN '2025-07-04 00:00:00' AND '2025-07-04 12:00:00'
ORDER BY timestamp;
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm run test:unit

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:coverage
```

## 📈 Performance Targets

- **Alert Latency**: <60 seconds end-to-end
- **Realtime Latency**: <100ms connection, <50ms message
- **System Uptime**: ≥99.9%
- **Concurrent Users**: 10,000+
- **API Rate Limits**: Respects all third-party limits

## 🚢 Deployment

### Production Build

```bash
# Build all applications
pnpm run build

# Build Docker images
docker build -f apps/api/Dockerfile -t riveralert/api .
docker build -f apps/web/Dockerfile -t riveralert/web .
```

### Environment Variables

Create `.env` files for each environment:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/riveralert
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=[TBD]
SUPABASE_ANON_KEY=[TBD]
SUPABASE_SERVICE_KEY=[TBD]

# External APIs
USGS_BASE_URL=https://waterservices.usgs.gov
NWS_BASE_URL=https://api.weather.gov
NOMINATIM_URL=https://nominatim.openstreetmap.org
OPENROUTE_API_KEY=[TBD]

# Optional
GOOGLE_MAPS_KEY=[TBD]
SENDGRID_API_KEY=[TBD]

# Security
JWT_SECRET=[Generate with: openssl rand -base64 32]
HMAC_SECRET=[Generate with: openssl rand -base64 32]
```

## 🔒 Security

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (admin, official, resident)
- **Encryption**: TLS 1.3, AES-256 at rest
- **Rate Limiting**: 100 requests/15min per IP
- **Input Validation**: Zod schemas on all endpoints
- **Audit Logging**: All admin actions logged

## 📝 API Documentation

Interactive API documentation available at `/docs` when running locally.

### Quick Examples

```bash
# Get active alerts
curl http://localhost:3001/v1/alerts?severity=high

# Submit sensor reading (requires HMAC signature)
curl -X POST http://localhost:3001/v1/readings \
  -H "Content-Type: application/json" \
  -H "X-HMAC-Signature: ${SIGNATURE}" \
  -d '{"sensor_id":"SNS-001","water_level_ft":5.2,"timestamp":"2025-09-13T12:00:00Z"}'

# Get safe route
curl "http://localhost:3001/v1/routes?origin=29.4,-98.5&destination=29.5,-98.4&avoid_floods=true"
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 👥 Team

**The AI Cowboys**
- Michael Pendleton, CEO/Founder
- Contact: contact_us@theaicowboys.com
- Phone: (210) 287-2024

## 🙏 Acknowledgments

- USGS for water data APIs
- NOAA/NWS for weather services
- OpenStreetMap contributors
- Supabase for realtime infrastructure
- Kerrville flood victims and families

## 📊 Status

- System Status: https://status.riveralert.com
- API Status: https://api.riveralert.com/v1/health

---

**"Every flood death is preventable with the right technology. RiverAlert ensures no family experiences the tragedy of Kerrville again."**