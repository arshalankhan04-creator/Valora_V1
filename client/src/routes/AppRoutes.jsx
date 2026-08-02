import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Listings from '../pages/Listings'
import ListingDetail from '../pages/ListingDetail'
import CreateListing from '../pages/CreateListing'
import Inquiries from '../pages/Inquiries'
import AdminDashboard from '../pages/AdminDashboard'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route
          path="/sell"
          element={
            <ProtectedRoute roles={['seller', 'admin']}>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inquiries"
          element={
            <ProtectedRoute>
              <Inquiries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
