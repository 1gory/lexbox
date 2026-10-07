import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';

describe('t', () => {
  it('returns the localized message', () => {
    const spy = vi.spyOn(browser.i18n, 'getMessage').mockReturnValue('Сохранить');
    expect(t('cardSave')).toBe('Сохранить');
    expect(spy).toHaveBeenCalledWith('cardSave', undefined);
    spy.mockRestore();
  });

  it('falls back to the key when the message is missing', () => {
    const spy = vi.spyOn(browser.i18n, 'getMessage').mockReturnValue('');
    expect(t('unknownKey')).toBe('unknownKey');
    spy.mockRestore();
  });

  it('falls back to the key when i18n throws', () => {
    const spy = vi.spyOn(browser.i18n, 'getMessage').mockImplementation(() => {
      throw new Error('not implemented');
    });
    expect(t('cardSave')).toBe('cardSave');
    spy.mockRestore();
  });
});
