import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // CSS Custom Highlight API (Highlight, CSS.highlights).
    minimum_chrome_version: '105',
    permissions: ['storage', 'unlimitedStorage', 'contextMenus'],
    commands: {
      'save-selection': {
        suggested_key: { default: 'Alt+S' },
        description: '__MSG_cmdSave__',
      },
    },
  },
});
