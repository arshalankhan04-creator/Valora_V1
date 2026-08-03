import { Link, Outlet } from 'react-router-dom'
import {
  Car,
  Search,
  Heart,
  MessageSquare,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function NavLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const initial = user?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Car className="size-5 text-primary" />
            Valora
          </Link>

          <nav className="flex items-center gap-5">
            <NavLink to="/listings" icon={Search}>Listings</NavLink>

            {user ? (
              <>
                {(user.role === 'seller' || user.role === 'admin') && (
                  <>
                    <NavLink to="/sell" icon={PlusCircle}>Sell a car</NavLink>
                    <NavLink to="/my-listings" icon={LayoutDashboard}>My listings</NavLink>
                    <NavLink to="/analytics" icon={BarChart3}>Analytics</NavLink>
                  </>
                )}
                <NavLink to="/wishlist" icon={Heart}>Wishlist</NavLink>
                <NavLink to="/inquiries" icon={MessageSquare}>Inquiries</NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin" icon={ShieldCheck}>Admin</NavLink>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-primary">{initial}</AvatarFallback>
                    </Avatar>
                    {user.name}
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} variant="destructive">
                      <LogOut className="size-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
