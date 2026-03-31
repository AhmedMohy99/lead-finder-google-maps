import "./globals.css";

export const metadata = {
  title: "Lead Finder - Google Maps",
  description: "Find stores and brands, check if they have a website, and export leads."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
