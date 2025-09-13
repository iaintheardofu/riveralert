# RiverAlert Setup Guide

## Quick Start with Supabase

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Enter project details:
   - Name: `riveralert`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Click "Create Project" and wait ~2 minutes

### 2. Get Your API Keys

Once your project is created, go to Settings → API:

- **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
- **Anon/Public Key**: (starts with `eyJ...`)
- **Service Key**: (keep this secret!)

### 3. Set Up the Database

#### Option A: Using Supabase SQL Editor (Recommended)

1. In Supabase Dashboard, go to SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Create another query and paste `supabase/seed.sql`
6. Click "Run"

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push

# Seed data
supabase db seed
```

### 4. Configure Environment Variables

#### For Local Development

Create `.env.local` file:

```env
# Get these from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### For Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
```

### 5. Enable Realtime

In Supabase Dashboard:

1. Go to Database → Replication
2. Enable replication for these tables:
   - `alerts`
   - `sensor_readings`
   - `crossings`
   - `weather_data`

### 6. Test the Connection

Run locally to test:

```bash
npm install
npm run dev
```

Visit http://localhost:3000 - you should see:
- Real-time sensor data
- Active alerts
- Low water crossing statuses
- ML predictions tab

## Features Once Connected

### Real-Time Updates
- Automatic alert generation when water levels exceed thresholds
- Live sensor reading updates every 30 seconds
- Crossing status changes (open/warning/closed)
- WebSocket subscriptions for instant updates

### ML/AI Predictions
- 6-hour flood forecasting
- Risk level classification
- Anomaly detection
- Pattern analysis

### Sample Data Included
- 5 active sensors in San Antonio area
- 5 low water crossings
- Recent sensor readings with varying water levels
- Weather data
- Automatic alert generation based on thresholds

## Troubleshooting

### "Invalid API Key" Error
- Double-check your keys in `.env.local`
- Make sure you're using the anon/public key (not service key) for frontend

### No Data Showing
1. Check if tables were created: SQL Editor → run `SELECT * FROM sensors;`
2. Verify RLS policies: Database → Policies → should show "Public read access"
3. Check browser console for errors

### Real-time Not Working
- Enable replication in Database → Replication
- Check WebSocket connection in browser DevTools → Network → WS

## Adding Real Sensor Data

To connect real USGS sensors:

```sql
-- Example: Add a real USGS gauge
INSERT INTO sensors (external_id, name, type, location, status) VALUES
('USGS-08178050', 'San Antonio River at Mitchell St', 'water_level',
 ST_GeomFromText('POINT(-98.4936 29.4241)', 4326), 'active');
```

Then fetch real data via the USGS API and insert into `sensor_readings`.

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Issues](https://github.com/iaintheardofu/riveralert/issues)