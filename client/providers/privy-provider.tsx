'use client'

import { PrivyProvider } from '@privy-io/react-auth'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ''

export default function ToroPrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ['google', 'email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#f97316',
          logo: '/icon.svg',
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
