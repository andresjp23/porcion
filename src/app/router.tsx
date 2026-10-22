import { createBrowserRouter, type RouteObject } from 'react-router'
import { TodayPage } from '@/features/today/TodayPage'

const devRoutes: RouteObject[] = [
  {
    path: '/dev/ui',
    lazy: async () => ({ Component: (await import('./dev/DevUiPage')).DevUiPage }),
  },
]

export const routes: RouteObject[] = [
  { path: '/', element: <TodayPage /> },
  ...(import.meta.env.DEV ? devRoutes : []),
]

export const router = createBrowserRouter(routes)
