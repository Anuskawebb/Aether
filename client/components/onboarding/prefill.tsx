'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useOnboarding } from '@/context/onboarding-context'

/**
 * Silent component — pre-populates the onboarding context with identity data
 * from the Privy user object (name, avatar) so step-1 shows it pre-filled.
 */
export default function OnboardingPrefill() {
  const { user }                                        = usePrivy()
  const { state, updateDisplayName, updateProfileImage } = useOnboarding()

  useEffect(() => {
    if (!user) return
    const name    = user.google?.name ?? user.email?.address?.split('@')[0] ?? ''
    const picture = user.twitter?.profilePictureUrl ?? ''

    if (!state.displayName     && name)    updateDisplayName(name)
    if (!state.profileImageUrl && picture) updateProfileImage(picture)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return null
}
