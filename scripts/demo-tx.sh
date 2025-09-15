#!/bin/bash

# RiverAlert Texas Demo Script
# For River Authority of Texas Meeting

echo "🌊 RiverAlert Texas Demo Setup"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker..."
    open -a Docker
    sleep 10
fi

# Start infrastructure
echo "📦 Starting infrastructure..."
docker compose up -d postgres redis

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Run migrations
echo "🔧 Running database migrations..."
npm run db:migrate

# Seed demo data
echo "🌱 Seeding Texas demo data..."
npm run db:seed:tx

# Generate HMAC example
echo "🔐 Generating HMAC signature example..."
HMAC_SECRET=${HMAC_SECRET:-"demo-hmac-secret"}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat << EOF
📡 Sample IoT Sensor Reading (with HMAC):

curl -X POST http://localhost:3000/api/v1/readings \\
  -H "Content-Type: application/json" \\
  -H "X-HMAC-Signature: $(echo -n '{"sensor_id":"bexar-01","water_level_ft":8.5,"flow_cfs":1250,"rainfall_in":0.5,"timestamp":"'$TIMESTAMP'"}' | openssl dgst -sha256 -hmac "$HMAC_SECRET" | cut -d' ' -f2)" \\
  -d '{
    "sensor_id": "bexar-01",
    "water_level_ft": 8.5,
    "flow_cfs": 1250,
    "rainfall_in": 0.5,
    "timestamp": "'$TIMESTAMP'"
  }'
EOF

# Start the application
echo ""
echo "🚀 Starting RiverAlert Texas..."
echo "================================"
echo "📍 Web Dashboard: http://localhost:3000/tx"
echo "📍 API Endpoint: http://localhost:3000/api"
echo "📍 Map Center: Bexar/Kerr Counties"
echo ""
echo "Demo Features:"
echo "  ✅ Real-time IoT sensor ingestion"
echo "  ✅ 6-hour AI predictions (Linear + NN + MDP)"
echo "  ✅ District-specific alerts (schools, emergency)"
echo "  ✅ Safe route navigation"
echo "  ✅ AI chat assistant (Claude/GPT-4)"
echo ""

# Start both API and Web in parallel
npm run dev