import * as React from 'react'
import { KvitregnEmailLayout } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <KvitregnEmailLayout
    preview="Dit login-link til Kvitregn"
    heading="Log ind hos Kvitregn"
    intro={
      <>
        Klik på knappen nedenfor for at logge ind på Kvitregn. Linket udløber
        om kort tid.
      </>
    }
    buttonLabel="Log ind"
    buttonUrl={confirmationUrl}
    outro="Har du ikke bedt om et login-link? Så kan du roligt ignorere denne mail."
  />
)

export default MagicLinkEmail
