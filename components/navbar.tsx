"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { getCurrentUser, setCurrentUser, type User } from "@/lib/store"
import {
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  User as UserIcon,
  X,
  Building2,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let active = true
    setMounted(true)
    getCurrentUser().then((current) => {
      if (active) setUser(current)
    })
    return () => {
      active = false
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    await setCurrentUser(null)
    setUser(null)
    router.push("/")
  }

  const dashboardLink = user
    ? user.role === "landlord"
      ? "/dashboard/landlord"
      : user.role === "pgowner"
        ? "/dashboard/pgowner"
        : "/dashboard/user"
    : null

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    ...(user
      ? [
          { href: dashboardLink!, label: "Dashboard", icon: LayoutDashboard },
          { href: "/chat", label: "Chat", icon: MessageSquare },
        ]
      : []),
  ]

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-border/60 bg-background/85 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">Homigo</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" role="navigation" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {user.name.split(" ")[0]}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={handleLogout}>
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="rounded-xl">
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t bg-background/95 backdrop-blur-xl md:hidden">
            <nav className="flex flex-col gap-1 p-4" role="navigation" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 border-t pt-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{user.name}</span>
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                          {user.role === "pgowner" ? "PG Owner" : user.role}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full rounded-xl"
                      onClick={() => { handleLogout(); setMobileOpen(false) }}
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full rounded-xl">Login</Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button size="sm" className="w-full rounded-xl">
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {user && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-xl md:hidden"
          role="navigation"
          aria-label="Mobile bottom navigation"
        >
          <div className="flex items-center justify-around py-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  pathname === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <link.icon className={`h-5 w-5 ${pathname === link.href ? "drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : ""}`} />
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
