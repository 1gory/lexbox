import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetTranslator, translate } from '@/lib/translator';

type Global = { Translator?: unknown };

function stubTranslator(availability: string, impl: (text: string) => Promise<string> = async (t) => `ru:${t}`) {
  const instance = { translate: vi.fn(impl) };
  const api = {
    availability: vi.fn(async () => availability),
    create: vi.fn(async () => instance),
  };
  (globalThis as Global).Translator = api;
  return { api, instance };
}

/** Stubs navigator.userActivation.isActive; `undefined` removes the API. */
function stubActivation(isActive: boolean | undefined) {
  Object.defineProperty(navigator, 'userActivation', {
    configurable: true,
    get: () => (isActive === undefined ? undefined : { isActive, hasBeenActive: isActive }),
  });
}

afterEach(() => {
  delete (globalThis as Global).Translator;
  delete (navigator as { userActivation?: unknown }).userActivation;
  resetTranslator();
  vi.restoreAllMocks();
});

describe('translate', () => {
  it('reports unavailable when the API is missing', async () => {
    expect(await translate('hello')).toEqual({ status: 'unavailable' });
  });

  it('reports unavailable when the language pair is unsupported', async () => {
    stubTranslator('unavailable');
    expect(await translate('hello')).toEqual({ status: 'unavailable' });
  });

  it('translates en -> ru and reuses one translator', async () => {
    const { api } = stubTranslator('available');
    expect(await translate('hello')).toEqual({ status: 'ok', text: 'ru:hello' });
    expect(await translate('world')).toEqual({ status: 'ok', text: 'ru:world' });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'en', targetLanguage: 'ru' });
    expect(api.create).toHaveBeenCalledWith({ sourceLanguage: 'en', targetLanguage: 'ru' });
  });

  it('notifies when the language pack has to be downloaded', async () => {
    stubTranslator('downloadable');
    const onDownloading = vi.fn();
    await translate('hello', onDownloading);
    expect(onDownloading).toHaveBeenCalledOnce();
  });

  it.each(['downloadable', 'downloading'])(
    'asks for a user gesture instead of creating the translator when %s without activation',
    async (availability) => {
      const { api } = stubTranslator(availability);
      stubActivation(false);
      const onDownloading = vi.fn();
      expect(await translate('hello', onDownloading)).toEqual({ status: 'needs-download' });
      expect(api.create).not.toHaveBeenCalled();
      expect(onDownloading).not.toHaveBeenCalled();

      // The retry from a click has activation.
      stubActivation(true);
      expect(await translate('hello', onDownloading)).toEqual({ status: 'ok', text: 'ru:hello' });
      expect(onDownloading).toHaveBeenCalledOnce();
      expect(api.create).toHaveBeenCalledOnce();
    },
  );

  it('needs no activation once the language pack is available', async () => {
    stubTranslator('available');
    stubActivation(false);
    expect(await translate('hello')).toEqual({ status: 'ok', text: 'ru:hello' });
  });

  it('returns error, logs it and recreates the translator after a failure', async () => {
    const { api, instance } = stubTranslator('available');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const boom = new Error('boom');
    instance.translate.mockRejectedValueOnce(boom);
    expect(await translate('hello')).toEqual({ status: 'error' });
    expect(warn).toHaveBeenCalledWith('[lexbox] translation failed', boom);
    expect(await translate('hello')).toEqual({ status: 'ok', text: 'ru:hello' });
    expect(api.create).toHaveBeenCalledTimes(2);
  });
});
