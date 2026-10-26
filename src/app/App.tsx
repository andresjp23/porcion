import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { OfflineBanner } from '@/ui/OfflineBanner'
import { createQueryClient } from './queryClient'
import { router } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineBanner />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
