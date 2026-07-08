import * as React from 'react'
import { KvitregnEmailLayout } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <KvitregnEmailLayout
    preview="Du er inviteret til Kvitregn"
    heading="Du er inviteret"
    intro={
      <>
        Du er inviteret til Kvitregn — en venlig digital mappe til kvitteringer
        og fakturaer. Klik nedenfor for at oprette din konto.
      </>
    }
    buttonLabel="Accepter invitationen"
    buttonUrl={confirmationUrl}
    outro="Havde du ikke forventet denne invitation? Så kan du roligt ignorere mailen."
  />
)

export default InviteEmail
