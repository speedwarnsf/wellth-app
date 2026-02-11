import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Page title & meta
      document.title = 'Wellth — Grow your wealth. Nourish your wellness.';
      const setMeta = (name: string, content: string, prop = 'name') => {
        let el = document.querySelector(`meta[${prop}="${name}"]`) as HTMLMetaElement;
        if (!el) { el = document.createElement('meta'); el.setAttribute(prop, name); document.head.appendChild(el); }
        el.content = content;
      };
      setMeta('description', 'Daily wealth & wellness tips to help you build a richer life — inside and out.');
      setMeta('og:title', 'Wellth', 'property');
      setMeta('og:description', 'Grow your wealth. Nourish your wellness.', 'property');
      setMeta('og:type', 'website', 'property');
      setMeta('theme-color', '#B8963E');

      // Inject Google Font
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Set background color on body
      document.body.style.backgroundColor = '#FAF8F3';
      document.body.style.margin = '0';
    }
  }, []);

  return <AppNavigator />;
}
