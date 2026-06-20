'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useAuth } from '@/context/auth-context'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

export default function UserMenu() {
  const { ready, authenticated, logout } = usePrivy()
  const { username, displayName, profileImageUrl } = useAuth()
  const [open, setOpen] = useState(false)

  if (!ready || !authenticated) return null

  const name   = displayName ?? username ?? 'User'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-sm"
      >
        {profileImageUrl ? (
          <img src={profileImageUrl} alt={name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-orange-accent/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-orange-accent">{initials}</span>
          </div>
        )}
        <span className="text-foreground font-medium max-w-[100px] truncate hidden sm:block">{name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 p-2">

            {/* Identity */}
            <div className="px-3 py-3 flex items-center gap-3">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-accent/10 flex items-center justify-center shrink-0">
                  <User size={16} className="text-orange-accent" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{displayName ?? name}</div>
                {username && (
                  <div className="text-xs text-muted-foreground mt-0.5">@{username}</div>
                )}
              </div>
            </div>

            <div className="border-t border-border my-1" />

            <button
              onClick={async () => { setOpen(false); await logout() }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-negative hover:bg-red-negative/10 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
