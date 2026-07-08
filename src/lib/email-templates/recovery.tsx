import * as React from 'react'
import { KvitregnEmailLayout } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <KvitregnEmailLayout
    preview="Nulstil din adgangskode hos Kvitregn"
    heading="Nulstil din adgangskode"
    intro={
      <>
        Vi har modtaget en anmodning om at nulstille din adgangskode. Klik på
        knappen nedenfor for at vælge en ny.
      </>
    }
    buttonLabel="Nulstil adgangskode"
    buttonUrl={confirmationUrl}
    outro="Har du ikke bedt om at nulstille din adgangskode? Så kan du roligt ignorere denne mail — din nuværende adgangskode ændres ikke."
  />
)

export default RecoveryEmail
