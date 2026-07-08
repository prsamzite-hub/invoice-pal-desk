import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const KVITREGN_LOGO_URL =
  'https://invoice-pal-desk.lovable.app/brand/lockup-on-light.png'

interface LayoutProps {
  preview: string
  heading: string
  intro: React.ReactNode
  buttonLabel: string
  buttonUrl: string
  outro?: React.ReactNode
  children?: React.ReactNode
}

export const KvitregnEmailLayout = ({
  preview,
  heading,
  intro,
  buttonLabel,
  buttonUrl,
  outro,
  children,
}: LayoutProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img
            src={KVITREGN_LOGO_URL}
            alt="Kvitregn"
            width="160"
            height="43"
            style={{ display: 'block', border: 0, outline: 'none' }}
          />
        </Section>
        <Section style={card}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{intro}</Text>
          {buttonUrl ? (
            <>
              <Section style={{ textAlign: 'center', margin: '28px 0 16px' }}>
                <Button style={button} href={buttonUrl}>
                  {buttonLabel}
                </Button>
              </Section>
              <Text style={fallback}>
                Virker knappen ikke? Kopier dette link ind i din browser:
                <br />
                <a href={buttonUrl} style={fallbackLink}>
                  {buttonUrl}
                </a>
              </Text>
            </>
          ) : null}
          {children}
          {outro ? <Text style={outroText}>{outro}</Text> : null}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Du modtager denne mail, fordi der blev anmodet om det på{' '}
          <a href="https://kvitregn.dk" style={footerLink}>
            kvitregn.dk
          </a>
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f5f2ea',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  margin: 0,
  padding: '32px 12px',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
}
const logoWrap = {
  textAlign: 'center' as const,
  padding: '4px 0 20px',
}
const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '32px 28px',
  border: '1px solid #e8e2d3',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: '#23241f',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text = {
  fontSize: '15px',
  color: '#23241f',
  lineHeight: '1.55',
  margin: '0',
}
const button = {
  backgroundColor: '#6b93a8',
  color: '#f5f2ea',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '999px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const fallback = {
  fontSize: '12px',
  color: '#6b6a63',
  lineHeight: '1.5',
  margin: '4px 0 0',
  wordBreak: 'break-all' as const,
}
const fallbackLink = {
  color: '#6b93a8',
  textDecoration: 'underline',
}
const outroText = {
  fontSize: '13px',
  color: '#6b6a63',
  lineHeight: '1.55',
  margin: '20px 0 0',
}
const hr = {
  borderColor: '#e8e2d3',
  margin: '24px 0 12px',
}
const footer = {
  fontSize: '12px',
  color: '#6b6a63',
  textAlign: 'center' as const,
  margin: 0,
}
const footerLink = {
  color: '#6b6a63',
  textDecoration: 'underline',
}
