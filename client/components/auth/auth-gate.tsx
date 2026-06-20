'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useAuth } from '@/context/auth-context'

const EXEMPT_PREFIXES = ['/onboarding', '/api', '/_next', '/login', '/sign-in']

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { ready, authenticated } = usePrivy()
  const { userId, onboardingCompleted, loading } = useAuth()

  useEffect(() => {
    // Wait for both Privy and our provision to settle
    if (!ready || loading) return

    // Not logged in — nothing to gate
    if (!authenticated || !userId) return

    // Exempt paths (onboarding itself, API routes, etc.)
    if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return

    // Logged in but hasn't completed onboarding → force to /onboarding
    if (!onboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [ready, loading, authenticated, userId, onboardingCompleted, pathname, router])

  return <>{children}</>
}
