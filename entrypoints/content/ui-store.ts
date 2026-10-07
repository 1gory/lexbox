import type { Entry } from '@/lib/types';
import type { SelectionInfo } from './dom';

export interface Point {
  x: number;
  y: number;
}

export type UiState =
  | { kind: 'idle' }
  | { kind: 'button'; at: Point; selection: SelectionInfo }
  | { kind: 'card'; at: Point; selection: SelectionInfo; existing: Entry | null }
  | { kind: 'tooltip'; at: Point; entry: Entry };

export interface UiStore {
  get(): UiState;
  set(state: UiState): void;
  subscribe(listener: () => void): () => void;
}

export interface UiActions {
  openCard(selection: SelectionInfo): void;
  close(): void;
}

export function createUiStore(): UiStore {
  let state: UiState = { kind: 'idle' };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
