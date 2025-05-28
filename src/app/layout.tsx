import type {Metadata} from 'next';
// Removed Geist font imports as they are not used in the new HTML structure
import './globals.css';

export const metadata: Metadata = {
  title: 'CNN Subscription Simulator',
  // Description can be set here or in the page if preferred
  description: 'Configure and simulate CNN subscription products.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add any global head elements here if needed, like charset, viewport */}
        <meta charSet="UTF-8" />
        {/* Viewport is usually handled by Next.js automatically, but can be explicit */}
      </head>
      <body>
        {children}
        {/* Toaster is removed as it's not part of the provided HTML */}
      </body>
    </html>
  );
}
