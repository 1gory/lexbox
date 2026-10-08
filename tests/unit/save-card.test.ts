import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { SaveCard } from '@/entrypoints/content/ui/SaveCard';
import { resetTranslator } from '@/lib/translator';

type Global = { Translator?: unknown };

let activation = false;
let container: HTMLElement;

const selection = { text: 'hello', sentence: 'Say hello.', rect: { left: 0, top: 0, right: 10, bottom: 10 } };

/** happy-dom events carry no isTrusted; mark this one as real user input. */
function trustedClick(el: Element) {
  const event = new MouseEvent('click', { bubbles: true });
  Object.defineProperty(event, 'isTrusted', { value: true });
  el.dispatchEvent(event);
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  fakeBrowser.reset();
  Object.defineProperty(navigator, 'userActivation', { configurable: true, get: () => ({ isActive: activation }) });
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
  delete (globalThis as Global).Translator;
  delete (navigator as { userActivation?: unknown }).userActivation;
  resetTranslator();
});

describe('SaveCard translator download', () => {
  it('offers a download button without user activation and translates after a click', async () => {
    const api = {
      availability: vi.fn(async () => 'downloadable'),
      create: vi.fn(async () => ({ translate: async (text: string) => `ru:${text}` })),
    };
    (globalThis as Global).Translator = api;
    activation = false;

    await act(() => render(h(SaveCard, { at: { x: 0, y: 0 }, selection, existing: null, onClose: () => {} }), container));
    await flush();
    const button = container.querySelector('.lx-download');
    expect(button).not.toBeNull();
    expect(api.create).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLInputElement>('.lx-translation')!.disabled).toBe(false);

    // A script click is ignored.
    (button as HTMLElement).click();
    await flush();
    expect(api.create).not.toHaveBeenCalled();

    activation = true;
    trustedClick(button!);
    await flush();
    expect(api.create).toHaveBeenCalledOnce();
    expect(container.querySelector<HTMLInputElement>('.lx-translation')!.value).toBe('ru:hello');
    expect(container.querySelector('.lx-download')).toBeNull();
  });
});
