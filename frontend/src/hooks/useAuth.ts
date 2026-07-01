import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function useAuth() {
  const { token, load, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [load])

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return { isAuthenticated: !!token, signOut }
}
