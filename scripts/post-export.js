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
    <meta property="og:url" content="https://wellth-mvp.vercel.app" />
    <meta property="og:image" content="https://wellth-mvp.vercel.app/assets/src/assets/wellth-logo.68ee2022b770a54940c44ca1c39a28f8.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Wellth" />
    <meta name="twitter:description" content="Daily wealth & wellness tips to help you build a richer life." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />`;

html = html.replace('</title>', '</title>' + metaTags);

// Fix body styles
html = html.replace(
  'overflow: hidden;',
  'overflow: hidden; background-color: #FAF8F3; -webkit-font-smoothing: antialiased;'
);

// Fix JSX-style attribute
html = html.replace('httpEquiv=', 'http-equiv=');

fs.writeFileSync(indexPath, html);
console.log('✅ SEO meta tags injected into dist/index.html');
