import { createBrowserRouter, type RouteObject } from 'react-router'
import { ConsentPage } from '@/features/auth/ConsentPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { AddFoodPage } from '@/features/foods/AddFoodPage'
import { CreateFoodPage } from '@/features/foods/CreateFoodPage'
import { FoodDetailPage } from '@/features/foods/FoodDetailPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { TodayPage } from '@/features/today/TodayPage'
import { StageGuard } from './StageGuard'

const devRoutes: RouteObject[] = [
  {
    path: '/dev/ui',
    lazy: async () => ({ Component: (await import('./dev/DevUiPage')).DevUiPage }),
  },
]

export const routes: RouteObject[] = [
  // Open to everyone. Sign-in and sign-up send signed-in users on to '/'.
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // A-4: each group is only reachable at its stage of the funnel.
  {
    element: <StageGuard stage="consent" />,
    children: [{ path: '/consent', element: <ConsentPage /> }],
  },
  {
    element: <StageGuard stage="onboarding" />,
    children: [{ path: '/onboarding/:step', element: <OnboardingPage /> }],
  },
  {
    element: <StageGuard stage="app" />,
    children: [
      { path: '/', element: <TodayPage /> },
      { path: '/add', element: <AddFoodPage /> },
      { path: '/foods/new', element: <CreateFoodPage /> },
      { path: '/foods/:id', element: <FoodDetailPage /> },
    ],
  },

  ...(import.meta.env.DEV ? devRoutes : []),
]

export const router = createBrowserRouter(routes)
