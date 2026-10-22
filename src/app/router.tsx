import { createBrowserRouter } from 'react-router'
import { TodayPage } from '@/features/today/TodayPage'

export const routes = [{ path: '/', element: <TodayPage /> }]

export const router = createBrowserRouter(routes)
