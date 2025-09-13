# RiverAlert - AI-Powered Real-Time Flood Intelligence Platform

[![CI/CD Pipeline](https://github.com/theaicowboys/riveralert/actions/workflows/ci.yml/badge.svg)](https://github.com/theaicowboys/riveralert/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ML](https://img.shields.io/badge/ML-Stanford%20CS221-purple)](https://stanford.edu/~shervine/teaching/cs-221/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

**Preventing tragedies like Kerrville through AI-powered flood intelligence**

RiverAlert is an advanced flood monitoring and prediction system developed by The AI Cowboys. Following the devastating July 4, 2025 Kerrville flood that claimed 135 lives, RiverAlert leverages cutting-edge AI/ML algorithms from Stanford CS221 to provide intelligent flood forecasting and optimal alert generation, delivering life-saving alerts in under 60 seconds.

## 🎯 Key Features

- **Real-Time Monitoring**: 30-second data updates from IoT sensors, USGS, and NOAA
- **AI-Powered Predictions**: 6-hour flood forecasting using linear regression and neural networks
- **Intelligent Alerts**: MDP-optimized risk assessment with multi-channel distribution
- **Safe Navigation**: Automatic routing around flooded areas via OpenRouteService/Google Maps
- **Anomaly Detection**: Real-time pattern recognition and outlier detection
- **Community Engagement**: Crowdsourced validation and bilingual support
- **Offline Support**: Critical data cached for connectivity loss
- **Universal Access**: Web, iOS, Android, SMS, and API access

## 🤖 AI/ML Intelligence

### Machine Learning Algorithms (Stanford CS221)

#### Linear Regression with Gradient Descent
- **Purpose**: Predicts future water levels based on historical patterns
- **Algorithm**: Stochastic Gradient Descent (SGD) with adaptive learning rates
- **Loss Function**: Minimizes squared loss: `Loss(x, y, w) = (f_w(x) - y)²`
- **Features**: Current level, previous level, max level, average level, flow rate
- **Accuracy**: MSE < 0.15

#### Neural Network for Pattern Recognition
- **Architecture**: Multi-layer perceptron [5 → 10 → 5 → 1]
- **Activation**: ReLU (hidden), Sigmoid (output)
- **Training**: Backpropagation with Xavier initialization
- **Purpose**: Complex flood pattern recognition and risk classification
- **Output**: Risk levels with confidence scores (92% accuracy)

#### Markov Decision Process (MDP)
- **Algorithm**: Value iteration with γ=0.9 discount factor
- **States**: Water level × change rate combinations
- **Actions**: Alert levels (none → evacuate)
- **Learning**: Continuous model updates based on outcomes
- **Purpose**: Optimal decision-making under uncertainty

### ML-Powered Features
- **6-Hour Predictions**: Water level forecasting with confidence intervals
- **Anomaly Detection**: Z-score based outlier and trend detection
- **Pattern Analysis**: Hourly and weekly flood pattern identification
- **Weather Integration**: Precipitation-adjusted predictions
- **Auto-Learning**: Online learning from new observations

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
- **AI/ML**: Custom TypeScript implementations of CS221 algorithms
- **ML Models**: Linear Predictor, Neural Network, MDP Solver
- **Infrastructure**: Docker, GitHub Actions, Vercel/Fly.io

### Project Structure

```
riveralert/
├── app/              # Next.js app directory
│   ├── api/          # API routes
│   │   ├── predictions/    # ML prediction endpoints
│   │   └── ml-insights/    # ML analytics endpoints
│   └── page.tsx      # Main dashboard with ML predictions
├── lib/
│   └── ml/           # Machine Learning implementations
│       ├── predictor.ts    # Linear, NN, MDP algorithms
│       └── floodAnalyzer.ts # ML integration layer
├── components/
│   └── MLPredictions.tsx   # ML predictions UI component
├── apps/
│   ├── api/          # Backend API server
│   └── web/          # Web application configs
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

### ML/AI API Endpoints

```bash
# Get ML predictions for sensors
curl "http://localhost:3001/api/predictions?sensor_id=SNS-001&hours=6"

# Train ML models with historical data
curl -X POST http://localhost:3001/api/predictions \
  -H "Content-Type: application/json" \
  -d '{"action":"train"}'

# Get ML insights and analytics
curl "http://localhost:3001/api/ml-insights?type=overview"
curl "http://localhost:3001/api/ml-insights?type=patterns"
curl "http://localhost:3001/api/ml-insights?type=anomalies"

# Update model with observation
curl -X POST http://localhost:3001/api/predictions \
  -H "Content-Type: application/json" \
  -d '{"action":"update","prevState":{"level":3.5,"rate":0.2},"action":"moderate_alert","newState":{"level":4.0,"rate":0.3},"outcome":"success"}'
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