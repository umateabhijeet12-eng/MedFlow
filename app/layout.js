import './globals.css'

export const metadata = {
  title: 'MedFlow',
  description: 'Patient follow-up platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}