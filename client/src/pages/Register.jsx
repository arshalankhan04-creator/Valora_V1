import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer',
  })
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <section className="max-w-sm mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Sign up</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2"
          required
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
        </select>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-gray-900 text-white rounded px-3 py-2"
        >
          Sign up
        </button>
      </form>
    </section>
  )
}
