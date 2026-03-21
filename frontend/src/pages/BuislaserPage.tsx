import { Layout } from '../components/Layout'
import { Zap } from 'lucide-react'

export function BuislaserPage() {
  return (
    <Layout>
      <div className="flex items-center gap-3 mb-8">
        <Zap className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Buislaser</h1>
      </div>
      <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
        <Zap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">Buislaser orders</p>
        <p className="text-xs text-gray-400 mt-1">In ontwikkeling</p>
      </div>
    </Layout>
  )
}
