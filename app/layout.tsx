import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b45309", // amber-700
};

export const metadata: Metadata = {
  title: {
    default: "Samadhan AI — State Grievance Services",
    template: "%s | Samadhan AI",
  },
  description:
    "Official grievance redressal portal of the Arunachal Pradesh Public Service Commission. AI-assisted complaint routing and resolution.",
  keywords: [
    "grievance",
    "complaint",
    "Arunachal Pradesh",
    "APPSC",
    "government",
    "redressal",
    "samadhan",
  ],
  authors: [{ name: "Arunachal Pradesh Public Service Commission" }],
  creator: "Samadhan AI",
  metadataBase: new URL("https://samadhan-ai.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Samadhan AI",
    title: "Samadhan AI — State Grievance Services",
    description:
      "Official AI-powered grievance redressal portal of Arunachal Pradesh. Submit, track, and resolve complaints online.",
    url: "https://samadhan-ai.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Samadhan AI — State Grievance Services",
    description:
      "AI-powered grievance redressal for Arunachal Pradesh citizens.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "GovernmentOrganization",
              name: "Arunachal Pradesh Public Service Commission",
              url: "https://samadhan-ai.vercel.app",
              description:
                "Official AI-powered grievance redressal portal of Arunachal Pradesh.",
              areaServed: {
                "@type": "AdministrativeArea",
                name: "Arunachal Pradesh, India",
              },
              serviceType: "Grievance Redressal",
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Skip to main content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-amber-700 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        <div id="main-content">
          <Providers>{children}</Providers>
        </div>
        <noscript>
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>JavaScript Required</h1>
            <p>Samadhan AI requires JavaScript to function. Please enable JavaScript in your browser settings.</p>
          </div>
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
