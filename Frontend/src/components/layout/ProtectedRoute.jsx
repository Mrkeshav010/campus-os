import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Blocks a page unless the user is logged in and (optionally) has one of the allowed roles
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}