// REF: https://demo.react.email/preview/welcome/koala-welcome?view=desktop&lang=jsx
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import { siteConfig } from "@/config/site"
import { formatPhoneNumber } from "@/lib/utils"

interface MagicLoginLinkEmailProps {
  name?: string | null
  email: string
  url: string
}

// const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/"

export const MagicLoginLinkEmail = ({
  name,
  email,
  url,
}: MagicLoginLinkEmailProps) => {
  const { host, searchParams } = new URL(url)
  const loginCode = searchParams.get("token")
  return (
    <Html>
      <Head />
      <Preview>Login to {siteConfig.name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`${host}/kat-logo.png`}
            width="170"
            height="170"
            alt="KAT Events Logo"
            style={logo}
          />
          <Text style={paragraph}>Hi {name || email},</Text>
          <Text style={paragraph}>Login to {siteConfig.name}.</Text>
          <Section style={btnContainer}>
            <Button style={button} href={url}>
              Login
            </Button>
          </Section>
          <Link
            href={url}
            target="_blank"
            style={{
              ...link,
              display: "block",
              marginBottom: "16px",
            }}
          >
            Click here to log in with this magic link
          </Link>
          <Text style={{ ...text, marginBottom: "14px" }}>
            Or, copy and paste this temporary login code:
          </Text>
          <code style={code}>{loginCode}</code>
          <Text
            style={{
              ...text,
              color: "#ababab",
              marginTop: "14px",
              marginBottom: "16px",
            }}
          >
            If you didn&apos;t try to login, you can safely ignore this email.
          </Text>
          <Text style={paragraph}>
            Best Wishes,
            <br />
            The Amman Admin Team
          </Text>
          <Hr style={hr} />
          <Text style={footer}>{siteConfig.address}</Text>
          <Text style={footer}>{formatPhoneNumber(siteConfig.links.tel)}</Text>
        </Container>
      </Body>
    </Html>
  )
}

MagicLoginLinkEmail.PreviewProps = {
  name: "User Name",
  email: "user@gmail.com",
  url: "https://subdomain.domain.com/resend?token=testtoken",
} as MagicLoginLinkEmailProps

export default MagicLoginLinkEmail

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
}

const logo = {
  margin: "0 auto",
}

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
}

const btnContainer = {
  textAlign: "center" as const,
}

const button = {
  backgroundColor: "#5F51E8",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
}

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
}

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
}

const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0",
}

const code = {
  display: "inline-block",
  padding: "16px 4.5%",
  width: "90.5%",
  backgroundColor: "#f4f4f4",
  borderRadius: "5px",
  border: "1px solid #eee",
  color: "#333",
}
