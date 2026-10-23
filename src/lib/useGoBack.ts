import { useLocation, useNavigate } from 'react-router'

/** Back to the previous screen, or to `fallback` when the app was opened right here. */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') void navigate(fallback)
    else void navigate(-1)
  }
}
