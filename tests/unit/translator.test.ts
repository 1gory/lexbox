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

afterEach(() => {
  delete (globalThis as Global).Translator;
  resetTranslator();
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

  it('returns error and recreates the translator after a failure', async () => {
    const { api, instance } = stubTranslator('available');
    instance.translate.mockRejectedValueOnce(new Error('boom'));
    expect(await translate('hello')).toEqual({ status: 'error' });
    expect(await translate('hello')).toEqual({ status: 'ok', text: 'ru:hello' });
    expect(api.create).toHaveBeenCalledTimes(2);
  });
});
