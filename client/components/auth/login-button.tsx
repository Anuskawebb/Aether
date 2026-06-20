'use client'

import { usePrivy } from '@privy-io/react-auth'
import { LogIn, Loader2 } from 'lucide-react'

export default function LoginButton() {
  const { ready, authenticated, login } = usePrivy()

  if (!ready || authenticated) return null

  return (
    <button
      onClick={login}
      style={{ backgroundColor: 'var(--orange-accent)' }}
      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
    >
      {!ready
        ? <Loader2 size={14} className="animate-spin" />
        : <LogIn size={14} />
      }
      Sign In
    </button>
  )
}
