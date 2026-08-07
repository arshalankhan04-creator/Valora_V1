import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back — pick up where you left off.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-2">
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Valora?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  )
}
