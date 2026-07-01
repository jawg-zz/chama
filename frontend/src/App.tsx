import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChamaList from './pages/ChamaList'
import ChamaDetail from './pages/ChamaDetail'
import MemberProfile from './pages/MemberProfile'
import Contributions from './pages/Contributions'
import Loans from './pages/Loans'
import Investments from './pages/Investments'
import Meetings from './pages/Meetings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  const { token } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chamas" element={<ChamaList />} />
          <Route path="/chamas/:id" element={<ChamaDetail />} />
          <Route path="/chamas/:chamaId/contributions" element={<Contributions />} />
          <Route path="/chamas/:chamaId/loans" element={<Loans />} />
          <Route path="/chamas/:chamaId/investments" element={<Investments />} />
          <Route path="/chamas/:chamaId/meetings" element={<Meetings />} />
          <Route path="/chamas/:chamaId/reports" element={<Reports />} />
          <Route path="/profile" element={<MemberProfile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
