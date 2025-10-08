import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from '@/locales/en/common.json';
import enNavigation from '@/locales/en/navigation.json';
import enCalculator from '@/locales/en/calculator.json';
import enDashboard from '@/locales/en/dashboard.json';
import enAdmin from '@/locales/en/admin.json';
import enTracking from '@/locales/en/tracking.json';
import enNotifications from '@/locales/en/notifications.json';
import enAuth from '@/locales/en/auth.json';

import zhCommon from '@/locales/zh-CN/common.json';
import zhNavigation from '@/locales/zh-CN/navigation.json';
import zhCalculator from '@/locales/zh-CN/calculator.json';
import zhDashboard from '@/locales/zh-CN/dashboard.json';
import zhAdmin from '@/locales/zh-CN/admin.json';
import zhTracking from '@/locales/zh-CN/tracking.json';
import zhNotifications from '@/locales/zh-CN/notifications.json';
import zhAuth from '@/locales/zh-CN/auth.json';

import arCommon from '@/locales/ar/common.json';
import arNavigation from '@/locales/ar/navigation.json';
import arCalculator from '@/locales/ar/calculator.json';
import arDashboard from '@/locales/ar/dashboard.json';
import arAdmin from '@/locales/ar/admin.json';
import arTracking from '@/locales/ar/tracking.json';
import arNotifications from '@/locales/ar/notifications.json';
import arAuth from '@/locales/ar/auth.json';

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    calculator: enCalculator,
    dashboard: enDashboard,
    admin: enAdmin,
    tracking: enTracking,
    notifications: enNotifications,
    auth: enAuth,
  },
  'zh-CN': {
    common: zhCommon,
    navigation: zhNavigation,
    calculator: zhCalculator,
    dashboard: zhDashboard,
    admin: zhAdmin,
    tracking: zhTracking,
    notifications: zhNotifications,
    auth: zhAuth,
  },
  ar: {
    common: arCommon,
    navigation: arNavigation,
    calculator: arCalculator,
    dashboard: arDashboard,
    admin: arAdmin,
    tracking: arTracking,
    notifications: arNotifications,
    auth: arAuth,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'calculator', 'dashboard', 'admin', 'tracking', 'notifications', 'auth'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Set HTML dir attribute based on language
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
