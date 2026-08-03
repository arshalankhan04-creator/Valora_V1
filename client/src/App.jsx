import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'
import AppRoutes from './routes/AppRoutes'
import { Toaster } from './components/ui/sonner'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
          <AppRoutes />
          <Toaster />
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
