import { createBrowserRouter, type RouteObject } from 'react-router'
import { ConsentPage } from '@/features/auth/ConsentPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { TodayPage } from '@/features/today/TodayPage'

const devRoutes: RouteObject[] = [
  {
    path: '/dev/ui',
    lazy: async () => ({ Component: (await import('./dev/DevUiPage')).DevUiPage }),
  },
]

export const routes: RouteObject[] = [
  { path: '/', element: <TodayPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/consent', element: <ConsentPage /> },
  ...(import.meta.env.DEV ? devRoutes : []),
]

export const router = createBrowserRouter(routes)
