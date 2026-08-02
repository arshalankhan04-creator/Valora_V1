import { useEffect, useState } from 'react'
import { getMyInquiries, addMessage } from '../services/inquiries'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'

export default function Inquiries() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMyInquiries()
      .then((data) => {
        setInquiries(data)
        if (data.length > 0) setSelectedId(data[0]._id)
      })
      .finally(() => setLoading(false))
  }, [])

  const selected = inquiries.find((i) => i._id === selectedId)

  const handleReply = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const updated = await addMessage(selectedId, reply)
      setInquiries((prev) => prev.map((i) => (i._id === selectedId ? updated : i)))
      setReply('')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="px-6 py-12 text-gray-500">Loading...</p>
  if (inquiries.length === 0) {
    return <p className="px-6 py-12 text-gray-500">No inquiries yet.</p>
  }

  return (
    <section className="px-6 py-8 flex gap-6 max-w-4xl mx-auto">
      <ul className="w-56 flex-shrink-0 border border-gray-200 rounded-lg divide-y divide-gray-200">
        {inquiries.map((inquiry) => {
          const otherParty = inquiry.buyer?._id === user.id ? inquiry.seller : inquiry.buyer
          return (
            <li key={inquiry._id}>
              <button
                onClick={() => setSelectedId(inquiry._id)}
                className={`w-full text-left px-3 py-2 text-sm ${inquiry._id === selectedId ? 'bg-gray-100' : ''}`}
              >
                <p className="font-medium text-gray-900">{inquiry.listing?.brand} {inquiry.listing?.model}</p>
                <p className="text-gray-500 text-xs">with {otherParty?.name}</p>
              </button>
            </li>
          )
        })}
      </ul>

      {selected && (
        <div className="flex-1 border border-gray-200 rounded-lg p-4 flex flex-col">
          <div className="border-b border-gray-200 pb-3 mb-3">
            <p className="font-medium text-gray-900">
              {selected.listing?.brand} {selected.listing?.model} · {formatPrice(selected.listing?.price)}
            </p>
          </div>

          <div className="flex-1 flex flex-col gap-2 mb-4">
            {selected.messages.map((msg) => {
              const fromMe = msg.sender === user.id || msg.sender?._id === user.id
              return (
                <div
                  key={msg._id}
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${fromMe ? 'self-end bg-gray-900 text-white' : 'self-start bg-gray-100 text-gray-900'}`}
                >
                  {msg.text}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleReply} className="flex gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-gray-900 text-white rounded px-3 py-2 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
