import client from './client'

export interface RegisterData {
  email: string
  phone: string
  first_name: string
  last_name: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export const register = (data: RegisterData) =>
  client.post<TokenResponse>('/auth/register', data).then((r) => r.data)

export const login = (data: LoginData) =>
  client.post<TokenResponse>('/auth/login', data).then((r) => r.data)

export const refreshToken = (refresh_token: string) =>
  client.post<TokenResponse>('/auth/refresh', { refresh_token }).then((r) => r.data)
