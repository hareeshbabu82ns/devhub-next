export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  address: string;
  links: {
    email: string;
    tel: string;
    map: string;
    twitter: string;
    github: string;
    docs: string;
  };
  defaultUserImg: string;
  defaultEventImg: string;
  emailVerificationDuration: number;
  urlQrCode: string;
  mainNav: {
    title: string;
    href: string;
  }[];
};

export const siteConfig = {
  name: "DevHub",
  description: "Hub for Devotional Resources",
  url: "https://devhub.local.terabits.io/",
  address: "Calgary, AB, Canada",
  links: {
    email: "hareeshbabu82@gmail.com",
    tel: "4031112222",
    twitter: "https://twitter.com/hpolla",
    github: "https://github.com/hareeshbabu82ns/hexplorer",
    docs: "https://kbase.local.terabits.io/",
  },
  defaultUserImg: "/default-om_256.png",
  defaultEventImg: "/kat-logo.png",
  emailVerificationDuration: 15,
  urlQrCode: "/qrcode_app_url.png",
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Files",
      href: "/files",
    },
    {
      title: "Settings",
      href: "/settings",
    },
  ],
};
