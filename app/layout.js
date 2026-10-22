import './globals.css';

export const metadata = {
  title: 'Tubegram — Save videos from YouTube and Instagram',
  description:
    'Paste a YouTube or Instagram link, preview it, and save it as MP4 or MP3.',
  applicationName: 'Tubegram',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0b10',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
