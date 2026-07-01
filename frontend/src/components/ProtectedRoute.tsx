import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function ProtectedRoute() {
  const { token, load } = useAuthStore()

  useEffect(() => {
    load()
  }, [load])

  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}
