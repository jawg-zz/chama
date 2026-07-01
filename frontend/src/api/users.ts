import client from './client'

export interface UserProfile {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
}

export interface UserChama {
  id: string
  chama_id: string
  chama_name: string
  role: string
  joined_at: string
}

export const getProfile = () =>
  client.get<UserProfile>('/users/me').then((r) => r.data)

export const updateProfile = (data: Partial<UserProfile>) =>
  client.put<UserProfile>('/users/me', data).then((r) => r.data)

export const changePassword = (current_password: string, new_password: string) =>
  client.post('/users/me/change-password', { current_password, new_password }).then((r) => r.data)

export const getMyChamas = () =>
  client.get<UserChama[]>('/users/me/chamas').then((r) => r.data)
