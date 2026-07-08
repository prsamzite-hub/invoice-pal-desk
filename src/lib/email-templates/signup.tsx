import * as React from 'react'
import { KvitregnEmailLayout } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <KvitregnEmailLayout
    preview="Bekræft din email hos Kvitregn"
    heading="Bekræft din email"
    intro={
      <>
        Velkommen til Kvitregn — din digitale mappe til kvitteringer og
        fakturaer. Klik på knappen nedenfor for at bekræfte din emailadresse.
      </>
    }
    buttonLabel="Bekræft email"
    buttonUrl={confirmationUrl}
    outro="Har du ikke oprettet en konto? Så kan du roligt ignorere denne mail."
  />
)

export default SignupEmail
