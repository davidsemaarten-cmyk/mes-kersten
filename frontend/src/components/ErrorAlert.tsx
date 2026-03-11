import { AlertTriangle } from 'lucide-react'

interface ErrorAlertProps {
  title: string
  description?: string
}

export function ErrorAlert({ title, description }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-red-800">{title}</p>
          {description && <p className="text-sm text-red-600 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  )
}
