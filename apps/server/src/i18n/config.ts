import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure i18next — pt-PT only
i18next
  .use(Backend)
  .init({
    debug: process.env.NODE_ENV === 'development',

    lng: 'pt-PT',
    fallbackLng: 'pt-PT',

    supportedLngs: ['pt-PT'],

    backend: {
      loadPath: join(__dirname, 'locales/{{lng}}/messages.json'),
    },

    interpolation: {
      escapeValue: false,
    },

    defaultNS: 'translation',
    ns: ['translation'],

    initImmediate: false,

    load: 'all',
  });

export default i18next;
