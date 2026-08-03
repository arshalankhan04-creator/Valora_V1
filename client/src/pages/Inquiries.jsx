import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { getMyInquiries, addMessage } from '../services/inquiries'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/format'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Skeleton } from '../components/ui/skeleton'
import { cn } from '../lib/utils'

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

  if (loading) {
    return (
      <section className="mx-auto flex max-w-4xl gap-6 px-6 py-8">
        <span className="sr-only">Loading...</span>
        <Skeleton className="h-96 w-56 flex-shrink-0 rounded-lg" />
        <Skeleton className="h-96 flex-1 rounded-lg" />
      </section>
    )
  }
  if (inquiries.length === 0) {
    return <p className="px-6 py-12 text-muted-foreground">No inquiries yet.</p>
  }

  return (
    <section className="mx-auto flex max-w-4xl gap-6 px-6 py-8">
      <ul className="w-56 flex-shrink-0 divide-y divide-border rounded-lg border border-border bg-card">
        {inquiries.map((inquiry) => {
          const otherParty = inquiry.buyer?._id === user.id ? inquiry.seller : inquiry.buyer
          return (
            <li key={inquiry._id}>
              <button
                onClick={() => setSelectedId(inquiry._id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  inquiry._id === selectedId ? 'bg-accent' : 'hover:bg-accent/50',
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {otherParty?.name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{inquiry.listing?.brand} {inquiry.listing?.model}</p>
                  <p className="truncate text-xs text-muted-foreground">with {otherParty?.name}</p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {selected && (
        <div className="flex flex-1 flex-col rounded-lg border border-border bg-card p-4">
          <div className="mb-3 border-b border-border pb-3">
            <p className="font-medium text-foreground">
              {selected.listing?.brand} {selected.listing?.model} · {formatPrice(selected.listing?.price)}
            </p>
          </div>

          <div className="mb-4 flex flex-1 flex-col gap-2">
            {selected.messages.map((msg) => {
              const fromMe = msg.sender === user.id || msg.sender?._id === user.id
              return (
                <div
                  key={msg._id}
                  className={cn(
                    'max-w-xs rounded-lg px-3 py-2 text-sm',
                    fromMe ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted text-foreground',
                  )}
                >
                  {msg.text}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleReply} className="flex gap-2">
            <Input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1"
            />
            <Button type="submit" disabled={sending} size="icon" aria-label="Send">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </section>
  )
}
