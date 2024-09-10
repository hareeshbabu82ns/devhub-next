// REF: https://demo.react.email/preview/welcome/koala-welcome?view=desktop&lang=jsx
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import { siteConfig } from "@/config/site"
import { formatPhoneNumber } from "@/lib/utils"

interface WelcomeEmailProps {
  name: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/"

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {siteConfig.name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/kat-logo.png`}
          width="170"
          height="170"
          alt="KAT Events Logo"
          style={logo}
        />
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>Welcome to {siteConfig.name}.</Text>
        <Section style={btnContainer}>
          <Button style={button} href={baseUrl}>
            Get started
          </Button>
        </Section>
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

WelcomeEmail.PreviewProps = {
  name: "User Name",
} as WelcomeEmailProps

export default WelcomeEmail

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
