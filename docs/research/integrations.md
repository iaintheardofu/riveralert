# RiverAlert API Integrations Documentation

*Last Updated: September 13, 2025*

## 1. Hydrology & Flood Alert APIs

### USGS Water Services (NWIS)
- **Base URL:** `https://waterservices.usgs.gov/nwis/`
- **Documentation:** https://waterservices.usgs.gov/docs/
- **Authentication:** None required
- **Rate Limits:** No documented limits, recommend 1 request/second
- **Key Endpoints:**
  - Instantaneous Values: `/iv/?format=json&sites={siteCode}&parameterCd={param}`
  - Site Information: `/site/?format=json&sites={siteCode}`
- **Parameters:**
  - `00065`: Gage height (feet)
  - `00060`: Discharge (cubic feet per second)
  - `00045`: Precipitation (inches)
- **Sample Request:**
```bash
curl "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=08178880&parameterCd=00065"
```
- **Update Frequency:** 15-60 minutes
- **License:** Public Domain
- **Accessed:** September 13, 2025

### NOAA/NWS Weather API
- **Base URL:** `https://api.weather.gov/`
- **Documentation:** https://www.weather.gov/documentation/services-web-api
- **Authentication:** None (User-Agent header required)
- **Rate Limits:** Reasonable use, no hard limits
- **Key Endpoints:**
  - Points: `/points/{lat},{lon}`
  - Alerts: `/alerts?area={state}`
  - Stations: `/stations/{stationId}/observations/latest`
  - Forecast: `/gridpoints/{office}/{gridX},{gridY}/forecast`
- **Sample Request:**
```bash
curl -H "User-Agent: RiverAlert/1.0" "https://api.weather.gov/alerts?area=TX"
```
- **Response Format:** GeoJSON
- **Update Frequency:** 5-10 minutes
- **License:** Public Domain
- **Accessed:** September 13, 2025

### Advanced Hydrologic Prediction Service (AHPS)
- **Base URL:** `https://water.weather.gov/ahps/`
- **Documentation:** Limited public API access
- **Alternative Access:** Web scraping or XML feeds at `/data/`
- **Key Resources:**
  - River observations: `/ahps2/hydrograph_to_xml.php?gage={gageId}&output=xml`
- **Sample URL:**
```
https://water.weather.gov/ahps2/hydrograph_to_xml.php?gage=krvt2&output=xml
```
- **Update Frequency:** Hourly
- **Accessed:** September 13, 2025

### FEMA National Flood Hazard Layer (NFHL)
- **Service URL:** `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer`
- **Type:** ArcGIS REST Service
- **Authentication:** None
- **Key Layers:**
  - Layer 28: Flood Hazard Areas
  - Layer 3: Base Flood Elevations
- **Sample Query:**
```
https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?where=1%3D1&geometry=-98.5,29.4,-98.4,29.5&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&f=json
```
- **License:** Public Domain with attribution
- **Accessed:** September 13, 2025

## 2. Mapping & Routing APIs

### OpenStreetMap Nominatim
- **Base URL:** `https://nominatim.openstreetmap.org/`
- **Documentation:** https://nominatim.org/release-docs/latest/api/
- **Rate Limits:** 1 request/second (strict)
- **Usage Policy:** Must display attribution, no heavy usage
- **Key Endpoints:**
  - Search: `/search?q={query}&format=json`
  - Reverse: `/reverse?lat={lat}&lon={lon}&format=json`
- **Sample Request:**
```bash
curl "https://nominatim.openstreetmap.org/search?q=Kerrville,TX&format=json&limit=1"
```
- **Headers Required:** User-Agent with contact email
- **License:** ODbL (attribution required)
- **Accessed:** September 13, 2025

### OpenRouteService
- **Base URL:** `https://api.openrouteservice.org/`
- **Documentation:** https://openrouteservice.org/dev/#/api-docs
- **Authentication:** API key required (free tier available)
- **Rate Limits (Free Tier):**
  - 40 requests/minute
  - 2,000 requests/day
- **Key Endpoints:**
  - Directions: `/v2/directions/{profile}`
  - Isochrones: `/v2/isochrones/{profile}`
  - Geocoding: `/geocode/search`
- **Sample Request:**
```bash
curl -X POST "https://api.openrouteservice.org/v2/directions/driving-car" \
  -H "Authorization: [API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"coordinates":[[-98.5,29.4],[-98.4,29.5]]}'
```
- **License:** Apache 2.0
- **Accessed:** September 13, 2025

### Waze Deep Links
- **Documentation:** https://developers.google.com/waze/deeplinks
- **Authentication:** None for deep links
- **URL Format:** `waze://?ll={lat},{lon}&navigate=yes`
- **Sample:**
```
waze://?ll=29.5074,-98.4516&navigate=yes
```
- **Limitations:** Opens Waze app if installed
- **Accessed:** September 13, 2025

### Google Maps Platform (Optional)
- **Base URL:** `https://maps.googleapis.com/maps/api/`
- **Free Tier:** $200 monthly credit (~28,000 requests)
- **Key Services:**
  - Directions: `/directions/json`
  - Geocoding: `/geocode/json`
  - Maps JavaScript API
- **Authentication:** API key required
- **Sample Request:**
```bash
curl "https://maps.googleapis.com/maps/api/directions/json?origin=29.4,-98.5&destination=29.5,-98.4&key=[API_KEY]"
```
- **Accessed:** September 13, 2025

## 3. Weather & Backup APIs

### Open-Meteo
- **Base URL:** `https://api.open-meteo.com/v1/`
- **Documentation:** https://open-meteo.com/en/docs
- **Authentication:** None required
- **Rate Limits:** 10,000 requests/day (non-commercial)
- **Key Endpoints:**
  - Forecast: `/forecast?latitude={lat}&longitude={lon}&hourly=precipitation`
- **Sample Request:**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=29.5&longitude=-98.4&hourly=precipitation"
```
- **License:** CC BY 4.0
- **Accessed:** September 13, 2025

## 4. Government Open Data

### OpenFEMA API
- **Base URL:** `https://www.fema.gov/api/open/`
- **Documentation:** https://www.fema.gov/about/reports-and-data/openfema
- **Authentication:** None
- **Key Datasets:**
  - Disaster Declarations: `/v2/DisasterDeclarationsSummaries`
  - Public Assistance: `/v2/PublicAssistanceFundedProjectsDetails`
- **Sample Request:**
```bash
curl "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state eq 'TX' and declarationType eq 'DR'"
```
- **License:** Public Domain
- **Accessed:** September 13, 2025

### Texas Open Data Portal
- **Base URL:** `https://data.texas.gov/`
- **Platform:** Socrata
- **Authentication:** App token recommended (free)
- **Key Datasets:**
  - Water Resources: Various datasets with SODA API endpoints
- **Sample Endpoint:**
```
https://data.texas.gov/resource/{dataset_id}.json
```
- **Documentation:** https://dev.socrata.com/
- **Accessed:** September 13, 2025

## 5. Notification Services

### Firebase Cloud Messaging (FCM)
- **Documentation:** https://firebase.google.com/docs/cloud-messaging
- **Free Tier:** Unlimited notifications
- **Authentication:** Service account JSON
- **Endpoints:**
  - Send: `https://fcm.googleapis.com/v1/projects/{project}/messages:send`
- **Rate Limits:** 600k requests/minute per project
- **Accessed:** September 13, 2025

### Email Services (Free Tiers)

#### SendGrid
- **Free Tier:** 100 emails/day
- **API:** `https://api.sendgrid.com/v3/mail/send`
- **Authentication:** API key

#### AWS SES (Sandbox)
- **Free Tier:** 62,000 emails/month (from EC2)
- **Sandbox Limits:** 200 emails/day, verified recipients only

## Integration Priority Matrix

| API | Priority | Cost | Implementation Effort | Value |
|-----|----------|------|----------------------|-------|
| USGS Water Services | Critical | Free | Low | High |
| NOAA/NWS Weather | Critical | Free | Low | High |
| OpenStreetMap | High | Free | Medium | High |
| OpenRouteService | High | Free | Medium | High |
| FCM | High | Free | Medium | High |
| Open-Meteo | Medium | Free | Low | Medium |
| FEMA NFHL | Medium | Free | High | Medium |
| Google Maps | Low | Paid | Low | Medium |

## Licensing & Attribution Requirements

1. **OpenStreetMap:** Must display "© OpenStreetMap contributors"
2. **NOAA/NWS:** Public domain, courtesy attribution recommended
3. **USGS:** Public domain, citation appreciated
4. **Open-Meteo:** CC BY 4.0, attribution required
5. **OpenRouteService:** Display "Powered by OpenRouteService"

## Rate Limiting Strategy

```javascript
// Recommended rate limiting configuration
const rateLimits = {
  nominatim: { requestsPerSecond: 1 },
  openRouteService: { requestsPerMinute: 40, requestsPerDay: 2000 },
  usgs: { requestsPerSecond: 1 },
  nws: { requestsPerSecond: 2 },
  openMeteo: { requestsPerDay: 10000 }
};
```

## Error Handling & Fallbacks

1. **Primary:** USGS Water Services
   - **Fallback:** Local cache (5-minute TTL)

2. **Primary:** OpenRouteService
   - **Fallback:** Nominatim for geocoding only

3. **Primary:** NOAA/NWS Alerts
   - **Fallback:** Open-Meteo for weather data

4. **Primary:** FCM Push
   - **Fallback:** Email notifications

---

*Note: All URLs and rate limits verified as of September 13, 2025. Check official documentation for updates.*