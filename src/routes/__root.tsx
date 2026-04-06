import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'


import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'CEF Viewer',
      },
      {
        name: 'description',
        content:
          'Parse and explore Common Event Format (CEF) messages locally in your browser.',
      },
      {
        name: 'theme-color',
        content: '#1565c0',
      },
      {
        property: 'og:title',
        content: 'CEF Viewer',
      },
      {
        property: 'og:description',
        content:
          'Parse and explore Common Event Format (CEF) messages locally in your browser.',
      },
      {
        property: 'og:image',
        content: '/icon.png',
      },
      {
        name: 'twitter:card',
        content: 'summary',
      },
      {
        name: 'twitter:title',
        content: 'CEF Viewer',
      },
      {
        name: 'twitter:image',
        content: '/icon.png',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/icon.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="selection:bg-[rgba(79,184,178,0.24)] font-sans antialiased [overflow-wrap:anywhere]">
        {children}
        
        <Scripts />
      </body>
    </html>
  )
}
