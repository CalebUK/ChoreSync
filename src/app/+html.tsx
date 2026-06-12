import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web document root — only used when running in a browser.
// Sets a dark page background and centres the phone frame.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>ChoreSync</title>
        <link rel="icon" href="/assets/images/logo.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #0A0A0A;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          #root {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .phone-shell {
            width: 393px;
            height: 852px;
            border-radius: 50px;
            overflow: hidden;
            box-shadow:
              0 0 0 2px #3A3A3C,
              0 40px 100px rgba(0,0,0,0.95);
            position: relative;
            flex-shrink: 0;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
