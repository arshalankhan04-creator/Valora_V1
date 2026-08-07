import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export default function BackButton({ fallback = '/', label = 'Back', className = '' }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = () => {
    // `location.key` is only ever 'default' for the very first entry in this
    // tab's history — i.e. this page was opened directly (a shared link, a
    // new tab, a bookmark), not reached by clicking something inside Valora.
    // In that case there's nothing meaningful in history to go back to, so
    // fall back to a known-good destination instead of navigate(-1).
    if (location.key === 'default') navigate(fallback)
    else navigate(-1)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className={cn('-ml-2', className)}>
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  )
}
