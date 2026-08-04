import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Send, Archive, ArchiveRestore, MessageSquare, Car, ShieldCheck } from 'lucide-react'
import { getMyInquiries, addMessage, markInquiryRead, setInquiryArchived } from '../services/inquiries'
import { useAuth } from '../context/AuthContext'
import { formatPrice, formatKm } from '../utils/format'
import { ASSET_BASE_URL } from '../services/api'
import TrustScoreBadge from '../components/TrustScoreBadge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { cn } from '../lib/utils'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Thumbnail({ src, size = 'size-11' }) {
  return (
    <div className={cn(size, 'flex-shrink-0 overflow-hidden rounded-lg bg-muted')}>
      {src ? (
        <img src={`${ASSET_BASE_URL}/${src}`} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Car className="size-5" />
        </div>
      )}
    </div>
  )
}

export default function Inquiries() {
  const { user } = useAuth()
  const { id: selectedId } = useParams()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getMyInquiries()
      .then(setInquiries)
      .finally(() => setLoading(false))
  }, [])

  const otherPartyOf = (inquiry) => (inquiry.buyer?._id === user.id ? inquiry.seller : inquiry.buyer)

  const counts = useMemo(
    () => ({
      active: inquiries.filter((i) => !i.archived).length,
      unread: inquiries.filter((i) => !i.archived && i.unread).length,
      archived: inquiries.filter((i) => i.archived).length,
    }),
    [inquiries],
  )

  const visible = useMemo(() => {
    let list = inquiries
    if (tab === 'active') list = list.filter((i) => !i.archived)
    else if (tab === 'unread') list = list.filter((i) => !i.archived && i.unread)
    else list = list.filter((i) => i.archived)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((i) => {
        const other = otherPartyOf(i)
        return (
          i.listing?.brand?.toLowerCase().includes(q) ||
          i.listing?.model?.toLowerCase().includes(q) ||
          other?.name?.toLowerCase().includes(q)
        )
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiries, tab, search])

  const selected = inquiries.find((i) => i._id === selectedId)

  // Marking read is keyed off the *resolved* selection rather than the click
  // handler alone, so it also fires when a conversation is opened via direct
  // URL, a bookmark, or browser back/forward — not just a row click.
  useEffect(() => {
    if (!selected || !selected.unread) return
    const id = selected._id
    setInquiries((prev) => prev.map((i) => (i._id === id ? { ...i, unread: false } : i)))
    markInquiryRead(id).catch(() => {
      setInquiries((prev) => prev.map((i) => (i._id === id ? { ...i, unread: true } : i)))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id])

  const handleToggleArchive = async (inquiry) => {
    const next = !inquiry.archived
    setInquiries((prev) => prev.map((i) => (i._id === inquiry._id ? { ...i, archived: next } : i)))
    try {
      await setInquiryArchived(inquiry._id, next)
    } catch {
      setInquiries((prev) => prev.map((i) => (i._id === inquiry._id ? { ...i, archived: !next } : i)))
      toast.error(next ? 'Could not archive conversation' : 'Could not unarchive conversation')
    }
  }

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
      <section className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
        <span className="sr-only">Loading...</span>
        <Skeleton className="h-[32rem] w-80 flex-shrink-0 rounded-xl" />
        <Skeleton className="h-[32rem] flex-1 rounded-xl" />
      </section>
    )
  }

  if (inquiries.length === 0) {
    return (
      <section className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent">
          <MessageSquare className="size-6 text-primary" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">No conversations yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Message a seller from any listing to start a conversation here.
        </p>
        <Button asChild className="mt-4">
          <Link to="/listings">Browse listings</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex h-[36rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex w-80 flex-shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 pt-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            <Button asChild size="sm" variant="outline">
              <Link to="/listings"><Plus className="size-4" /> New</Link>
            </Button>
          </div>

          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9"
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="active">Active {counts.active}</TabsTrigger>
              <TabsTrigger value="unread">Unread {counts.unread}</TabsTrigger>
              <TabsTrigger value="archived">Archived {counts.archived}</TabsTrigger>
            </TabsList>
          </Tabs>

          <ul className="mt-3 flex-1 divide-y divide-border overflow-y-auto">
            {visible.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                {tab === 'archived'
                  ? 'No archived conversations.'
                  : tab === 'unread'
                    ? 'No unread messages.'
                    : 'No conversations match.'}
              </li>
            )}
            {visible.map((inquiry) => {
              const other = otherPartyOf(inquiry)
              const lastMessage = inquiry.messages[inquiry.messages.length - 1]
              const lastMine = lastMessage?.sender === user.id || lastMessage?.sender?._id === user.id
              return (
                <li key={inquiry._id}>
                  <Link
                    to={`/inquiries/${inquiry._id}`}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                      inquiry._id === selectedId ? 'bg-accent' : 'hover:bg-accent/50',
                    )}
                  >
                    <Thumbnail src={inquiry.listing?.images?.[0]} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm text-foreground', inquiry.unread && 'font-semibold')}>
                          {other?.name}
                        </p>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                          {timeAgo(lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {inquiry.listing?.brand} {inquiry.listing?.model} · {formatPrice(inquiry.listing?.price)}
                      </p>
                      <p className={cn('mt-0.5 truncate text-xs', inquiry.unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {lastMine ? 'You: ' : ''}{lastMessage?.text}
                      </p>
                    </div>
                    {inquiry.unread && <span className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-primary" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-1 flex-col">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Select a conversation</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Your conversations about car listings will appear here. Each thread stays tied to a
                  specific listing so nothing gets confused.
                </p>
              </div>
              <div className="mt-2 grid w-full max-w-sm gap-2">
                <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-left">
                  <Car className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">One thread per listing</p>
                    <p className="text-xs text-muted-foreground">Two cars from the same seller become two separate chats.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-left">
                  <ShieldCheck className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Listing context pinned</p>
                    <p className="text-xs text-muted-foreground">Price, kilometres, and trust signals stay visible while you chat.</p>
                  </div>
                </div>
              </div>
              <Button asChild className="mt-2">
                <Link to="/listings">Browse cars to start a chat</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-border p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Thumbnail src={selected.listing?.images?.[0]} size="size-10" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {selected.listing?.brand} {selected.listing?.model}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatPrice(selected.listing?.price)} · {formatKm(selected.listing?.kmDriven)}
                    </p>
                  </div>
                  {selected.listing?.ml?.trustScore != null && <TrustScoreBadge score={selected.listing.ml.trustScore} />}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleArchive(selected)}>
                    {selected.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                    {selected.archived ? 'Unarchive' : 'Archive'}
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/listings/${selected.listing?._id}`}>View listing</Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {selected.messages.map((msg) => {
                  const fromMe = msg.sender === user.id || msg.sender?._id === user.id
                  return (
                    <div key={msg._id} className={cn('flex flex-col gap-0.5', fromMe ? 'items-end self-end' : 'items-start self-start')}>
                      <div
                        className={cn(
                          'max-w-xs rounded-2xl px-4 py-2.5 text-sm',
                          fromMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                        )}
                      >
                        {msg.text}
                      </div>
                      {msg.createdAt && (
                        <span className="px-1 text-[11px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <form onSubmit={handleReply} className="flex gap-2 border-t border-border p-4">
                <Input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-full"
                />
                <Button type="submit" disabled={sending} size="icon" className="flex-shrink-0 rounded-full" aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
