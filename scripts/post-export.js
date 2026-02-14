#!/usr/bin/env node
/**
 * Post-export script: injects SEO meta tags into dist/index.html
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace title
html = html.replace(/<title>.*?<\/title>/, '<title>Wellth — Grow your wealth. Nourish your wellness.</title>');

// Inject meta tags after <title>
const metaTags = `
    <meta name="description" content="Daily wealth & wellness tips to help you build a richer life — inside and out." />
    <meta name="theme-color" content="#B8963E" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Wellth" />
    <meta property="og:title" content="Wellth — Grow your wealth. Nourish your wellness." />
    <meta property="og:description" content="Daily wealth & wellness tips to help you build a richer life — inside and out." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://wellth-real.vercel.app" />
    <meta property="og:image" content="https://wellth-real.vercel.app/assets/src/assets/wellth-logo.68ee2022b770a54940c44ca1c39a28f8.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Wellth" />
    <meta name="twitter:description" content="Daily wealth & wellness tips to help you build a richer life." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" /></noscript>`;

html = html.replace('</title>', '</title>' + metaTags);

// Fix body styles — allow scrolling on mobile (RN ScrollView sometimes fails on mobile web)
html = html.replace(
  'overflow: hidden;',
  'overflow: auto !important; -webkit-overflow-scrolling: touch; background-color: #FAF8F3; -webkit-font-smoothing: antialiased;'
);

// Add extra scroll fix that overrides any runtime JS — including a MutationObserver
// to fight React Native Web re-applying overflow:hidden at runtime
const scrollFix = `
    <style id="scroll-fix">
      html, body, #root { overflow: auto !important; height: auto !important; min-height: 100% !important; position: static !important; }
      body { -webkit-overflow-scrolling: touch !important; overflow-y: scroll !important; }
      #root > div { min-height: 100vh; overflow: auto !important; }
      /* Override RNW's ScrollView wrapper that traps scroll */
      [data-testid="scroll-view"], [style*="overflow: hidden"] {
        overflow: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
    </style>
    <script>
      // Fight RNW runtime overflow:hidden — observe and override
      (function() {
        function forceScroll() {
          document.body.style.setProperty('overflow', 'auto', 'important');
          document.body.style.setProperty('overflow-y', 'scroll', 'important');
          document.body.style.setProperty('height', 'auto', 'important');
          document.body.style.setProperty('position', 'static', 'important');
          var root = document.getElementById('root');
          if (root) {
            root.style.setProperty('overflow', 'auto', 'important');
            root.style.setProperty('height', 'auto', 'important');
            root.style.setProperty('min-height', '100%', 'important');
            // Fix first child of root (RNW app container)
            if (root.firstElementChild) {
              root.firstElementChild.style.setProperty('overflow', 'auto', 'important');
              root.firstElementChild.style.setProperty('height', 'auto', 'important');
              root.firstElementChild.style.setProperty('min-height', '100vh', 'important');
            }
          }
        }
        // Run immediately, after DOM ready, and observe mutations
        forceScroll();
        document.addEventListener('DOMContentLoaded', forceScroll);
        window.addEventListener('load', function() {
          forceScroll();
          // Keep enforcing for 2 seconds after load (RNW hydration)
          var count = 0;
          var interval = setInterval(function() {
            forceScroll();
            if (++count > 10) clearInterval(interval);
          }, 200);
        });
        // MutationObserver to catch RNW style changes
        var observer = new MutationObserver(function(mutations) {
          forceScroll();
        });
        // Only observe root and body — not entire subtree (performance)
        observer.observe(document.body, {
          attributes: true, attributeFilter: ['style'],
          childList: true
        });
        var rootEl = document.getElementById('root');
        if (rootEl) {
          observer.observe(rootEl, {
            attributes: true, attributeFilter: ['style'],
            childList: true
          });
        }
      })();
    </script>`;
html = html.replace('</head>', scrollFix + '\n  </head>');

// Copy service worker and manifest to dist
const publicFiles = ['sw.js', 'manifest.json'];
publicFiles.forEach(file => {
  const src = path.join(__dirname, '..', 'public', file);
  const dest = path.join(__dirname, '..', 'dist', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ ${file} copied to dist/`);
  }
});

// Add manifest link for PWA
const manifestTag = `\n    <link rel="manifest" href="/manifest.json" />`;
html = html.replace('</title>' + metaTags, '</title>' + metaTags + manifestTag);

// Fix JSX-style attribute
html = html.replace('httpEquiv=', 'http-equiv=');

fs.writeFileSync(indexPath, html);
console.log('✅ SEO meta tags injected into dist/index.html');
