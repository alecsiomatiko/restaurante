import { Suspense } from 'react'
import ThankYouClient from './thank-you-client'

interface ThankYouPageProps {
  searchParams: Promise<{
    orderId?: string
    payment?: string 
    status?: string
  }>
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  // En Next.js 15, searchParams es una Promise
  const params = await searchParams
  
  return (
    <Suspense fallback={<ThankYouLoading />}>
      <ThankYouClient 
        orderId={params.orderId}
        paymentMethod={params.payment}
        status={params.status}
      />
    </Suspense>
  )
}

function ThankYouLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p className="text-purple-200 text-lg">Preparando tu confirmación...</p>
      </div>
    </div>
  )
}