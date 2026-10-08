import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Visible build folder: macOS file pickers hide dot-folders like .output.
  outDir: 'dist',
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    author: { email: 'igor.pershin.me@gmail.com' },
    homepage_url: 'https://github.com/1gory/lexbox',
    // CSS Custom Highlight API (Highlight, CSS.highlights).
    minimum_chrome_version: '105',
    // activeTab: opening the popup lets it read the active tab's url (no install warning), so it can
    // tell a web page opened before install, which only needs a reload, from a restricted page.
    permissions: ['storage', 'unlimitedStorage', 'contextMenus', 'activeTab'],
    commands: {
      'save-selection': {
        suggested_key: { default: 'Alt+S' },
        description: '__MSG_cmdSave__',
      },
    },
  },
});
