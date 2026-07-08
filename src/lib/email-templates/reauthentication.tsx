import * as React from 'react'
import { Text } from '@react-email/components'
import { KvitregnEmailLayout } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <KvitregnEmailLayout
    preview="Din bekræftelseskode til Kvitregn"
    heading="Bekræft din identitet"
    intro={
      <>
        Brug koden nedenfor for at bekræfte din identitet hos Kvitregn. Koden
        udløber om kort tid.
      </>
    }
    buttonLabel=""
    buttonUrl=""
    outro="Har du ikke bedt om denne kode? Så kan du roligt ignorere mailen."
  >
    <Text style={codeStyle}>{token}</Text>
  </KvitregnEmailLayout>
)

export default ReauthenticationEmail

const codeStyle = {
  fontFamily: "'JetBrains Mono', Menlo, Courier, monospace",
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#23241f',
  letterSpacing: '0.24em',
  textAlign: 'center' as const,
  background: '#f5f2ea',
  borderRadius: '12px',
  padding: '18px 12px',
  margin: '20px 0 8px',
}
