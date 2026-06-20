'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'

interface AuthState {
  userId:              string | null
  username:            string | null
  displayName:         string | null
  profileImageUrl:     string | null
  onboardingCompleted: boolean
  loading:             boolean
  error:               string | null
}

interface AuthContextValue extends AuthState {
  getToken:               () => Promise<string | null>
  reprovision:            () => Promise<void>
  markOnboardingComplete: () => void
  updateIdentity:         (patch: { username?: string; displayName?: string; profileImageUrl?: string }) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy()

  // Start loading=true so AuthGate waits — never show a page before we know onboarding status
  const [state, setState] = useState<AuthState>({
    userId: null, username: null, displayName: null, profileImageUrl: null,
    onboardingCompleted: false, loading: true, error: null,
  })

  const provisionedFor = useRef<string | null>(null)

  const provision = async (privyUserId: string) => {
    if (provisionedFor.current === privyUserId) return
    provisionedFor.current = privyUserId

    setState((p) => ({ ...p, loading: true, error: null }))
    try {
      const token = await getAccessToken()
      if (!token) {
        // Token not ready yet — clear guard so next ready-change retries
        provisionedFor.current = null
        setState((p) => ({ ...p, loading: false, error: 'no_token' }))
        return
      }

      const email           = user?.email?.address ?? user?.google?.email
      const displayName     = user?.google?.name    ?? user?.email?.address?.split('@')[0] ?? undefined
      const profileImageUrl = user?.twitter?.profilePictureUrl ?? undefined

      const res = await fetch('/api/auth/provision', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, displayName, profileImageUrl }),
        cache:   'no-store',
      })

      if (!res.ok) {
        console.error('[AuthProvider] provision failed', res.status, await res.text().catch(() => ''))
        provisionedFor.current = null
        setState((p) => ({ ...p, loading: false, error: `provision_${res.status}` }))
        return
      }

      const data = await res.json() as {
        userId:              string
        onboardingCompleted: boolean
        username:            string | null
      }

      setState({
        userId:              data.userId,
        username:            data.username,
        displayName:         displayName     ?? null,
        profileImageUrl:     profileImageUrl ?? null,
        onboardingCompleted: data.onboardingCompleted,
        loading:             false,
        error:               null,
      })
    } catch (err) {
      console.error('[AuthProvider] provision error:', err)
      provisionedFor.current = null
      setState((p) => ({ ...p, loading: false, error: 'network' }))
    }
  }

  useEffect(() => {
    // Wait for Privy to finish initialising
    if (!ready) return

    if (!authenticated || !user?.id) {
      provisionedFor.current = null
      setState({
        userId: null, username: null, displayName: null, profileImageUrl: null,
        onboardingCompleted: false, loading: false, error: null,
      })
      return
    }

    void provision(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user?.id])

  const markOnboardingComplete = () =>
    setState((p) => ({ ...p, onboardingCompleted: true }))

  const updateIdentity = (patch: { username?: string; displayName?: string; profileImageUrl?: string }) =>
    setState((p) => ({
      ...p,
      username:        patch.username        ?? p.username,
      displayName:     patch.displayName     ?? p.displayName,
      profileImageUrl: patch.profileImageUrl ?? p.profileImageUrl,
    }))

  return (
    <AuthContext.Provider value={{
      ...state,
      getToken:               getAccessToken,
      reprovision:            () => provision(user?.id ?? ''),
      markOnboardingComplete,
      updateIdentity,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
