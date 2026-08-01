import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Listings from '../pages/Listings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
