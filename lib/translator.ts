export const SOURCE_LANG = 'en';
export const TARGET_LANG = 'ru';

export type TranslateResult = { status: 'ok'; text: string } | { status: 'unavailable' } | { status: 'error' };

interface LanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslatorInstance {
  translate(text: string): Promise<string>;
}

/** Subset of Chrome's built-in Translator API (Chrome 138+). */
interface TranslatorApi {
  availability(pair: LanguagePair): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(pair: LanguagePair): Promise<TranslatorInstance>;
}

const PAIR: LanguagePair = { sourceLanguage: SOURCE_LANG, targetLanguage: TARGET_LANG };

let instance: Promise<TranslatorInstance> | null = null;

function api(): TranslatorApi | undefined {
  return (globalThis as { Translator?: TranslatorApi }).Translator;
}

/**
 * On-device translation. Call it from a user gesture: downloading the language
 * pack the first time requires user activation.
 */
export async function translate(text: string, onDownloading?: () => void): Promise<TranslateResult> {
  const translatorApi = api();
  if (!translatorApi) return { status: 'unavailable' };
  try {
    if (!instance) {
      const availability = await translatorApi.availability(PAIR);
      if (availability === 'unavailable') return { status: 'unavailable' };
      if (availability !== 'available') onDownloading?.();
      instance = translatorApi.create(PAIR);
    }
    const translator = await instance;
    return { status: 'ok', text: await translator.translate(text) };
  } catch {
    instance = null;
    return { status: 'error' };
  }
}

export function resetTranslator(): void {
  instance = null;
}
