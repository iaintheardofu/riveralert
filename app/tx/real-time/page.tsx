'use client'

import dynamic from 'next/dynamic'

// Dynamic imports for real-time components
const RealTimeTexasDashboard = dynamic(() => import('@/components/RealTimeTexasDashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-8 text-center">
            <div className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin rounded-full border-b-2 border-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Loading Real-time Dashboard</h3>
            <p className="text-gray-600">Connecting to live data streams...</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function RealTimeTexasPage() {
  // Production mode - directly load the real-time dashboard
  return <RealTimeTexasDashboard />
}