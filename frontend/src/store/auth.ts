import { create } from 'zustand'

interface AuthState {
  token: string | null
  refreshToken: string | null
  setTokens: (access: string, refresh: string) => void
  logout: () => void
  load: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ token: access, refreshToken: refresh })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, refreshToken: null })
  },
  load: () => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    if (token && refreshToken) {
      set({ token, refreshToken })
    }
  },
}))
