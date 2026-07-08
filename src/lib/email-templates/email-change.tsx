import * as React from 'react'
import { KvitregnEmailLayout } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <KvitregnEmailLayout
    preview="Bekræft din nye email hos Kvitregn"
    heading="Bekræft din nye email"
    intro={
      <>
        Du har bedt om at ændre din emailadresse hos Kvitregn fra{' '}
        <strong>{oldEmail}</strong> til <strong>{newEmail}</strong>. Klik
        nedenfor for at bekræfte ændringen.
      </>
    }
    buttonLabel="Bekræft ny email"
    buttonUrl={confirmationUrl}
    outro="Har du ikke bedt om denne ændring, bør du straks sikre din konto ved at nulstille din adgangskode."
  />
)

export default EmailChangeEmail
