# WELLTH Landing Page - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: One-Click Deploy to Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/wellth-landing)

### Option 2: Manual Deployment

#### Files Included:
- `index.html` - Your WELLTH landing page
- `vercel.json` - Vercel configuration
- `package.json` - Project metadata

## 📋 Step-by-Step Deployment

### 1. Deploy to Vercel (Free Hosting)

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project folder
cd wellth-website

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

### 2. Configure Your Domain (goodwellth.com)

#### In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Domains"
3. Add `goodwellth.com` and `www.goodwellth.com`
4. Vercel will provide DNS settings

#### In GoDaddy:
1. Log into GoDaddy Domain Manager
2. Select goodwellth.com
3. Click "DNS" or "Manage DNS"
4. Update records:

**Remove existing A and CNAME records, then add:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | 600 |
| CNAME | www | cname.vercel-dns.com | 600 |

### 3. SSL Certificate
Vercel automatically provisions SSL certificates once DNS is configured.

## 🔗 Connecting the App

### Firebase Configuration
In your React Native app's `firebaseService.js`, update:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "wellth-61719160.firebaseapp.com",
  projectId: "wellth-61719160",
  storageBucket: "wellth-61719160.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Update Download Links
In `index.html`, update the download buttons:

```html
<!-- iOS App Store -->
<a href="https://apps.apple.com/app/wellth/idYOURAPPID" class="btn-primary">
    🍎 Download for iOS
</a>

<!-- Google Play Store -->
<a href="https://play.google.com/store/apps/details?id=com.yourcompany.wellth" class="btn-primary">
    🤖 Get for Android
</a>
```

## 📱 App Distribution (Before App Store)

### TestFlight (iOS)
1. Upload build to App Store Connect
2. Add external testers
3. Share TestFlight link on landing page

### APK Distribution (Android)
1. Build APK: `expo build:android`
2. Host APK on your server
3. Add download link to landing page

## 🎯 Alternative Hosting Options

### GitHub Pages (Free)
```bash
# Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/wellth-landing.git
git push -u origin main

# Enable GitHub Pages in repo settings
```

### Netlify (Free)
1. Visit netlify.com
2. Drag and drop the `wellth-website` folder
3. Configure custom domain in settings

## 📊 Analytics (Optional)

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_ID');
</script>
```

## ✅ Launch Checklist

- [ ] Deploy landing page to Vercel
- [ ] Configure DNS in GoDaddy
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Test https://goodwellth.com
- [ ] Test https://www.goodwellth.com
- [ ] Update app download links
- [ ] Configure Firebase
- [ ] Test app with Firebase connection
- [ ] Set up analytics (optional)
- [ ] Share with beta testers!

## 🆘 Troubleshooting

**Site not loading?**
- DNS can take up to 48 hours to fully propagate
- Check DNS status: https://dnschecker.org/#A/goodwellth.com

**SSL not working?**
- Vercel automatically provisions SSL after DNS is configured
- May take 10-20 minutes after DNS setup

**Firebase not connecting?**
- Verify API keys are correct
- Check Firebase project settings
- Ensure Firestore is enabled

---

🦉 Ready to launch WELLTH! Your daily wisdom awaits at goodwellth.com