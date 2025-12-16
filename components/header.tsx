"use client"

import Link from "next/link"
import { Wifi, WifiOff, Moon, Sun, User as UserIcon, History } from "lucide-react"
import { useTheme } from "@/providers/theme-provider"
import { useAuth } from "@/lib/auth-context"
import { LogoutButton } from "@/components/logout-button"

interface HeaderProps {
  isConnected: boolean
}

export function Header({ isConnected }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, isLoading } = useAuth()

  const connectionText = isConnected ? "Connected" : "Disconnected"
  const connectionColor = isConnected ? "text-green-400" : "text-red-400"

  return (
    <header className="border-b border-border bg-card px-4 md:px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
            <div className="w-6 h-6 rounded bg-linear-to-br from-accent to-accent/50" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Health Monitor</h1>
            <p className="text-xs text-muted-foreground">ESP32-001 • Live Stream</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground">
              Home
            </Link>
            <Link href="/history" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </Link>
          </nav>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className={`text-xs font-medium ${connectionColor}`}>{connectionText}</span>
            {isConnected ? (
              <Wifi className="w-5 h-5 text-accent animate-pulse" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive" />
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-accent" />}
          </button>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/60 border border-border">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-foreground text-sm">
                  {isLoading ? "Loading..." : isAuthenticated && user ? user.name : "Guest"}
                </span>
                <span className="text-xs text-muted-foreground truncate" title={user?.email}>
                  {isLoading ? "" : isAuthenticated && user ? user.email : ""}
                </span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
