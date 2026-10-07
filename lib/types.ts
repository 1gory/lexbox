export interface Context {
  sentence: string;
  url: string;
  title: string;
  addedAt: number;
}

export interface Entry {
  id: string;
  /** As the user saved it: "put up with". */
  text: string;
  /** normalizeKey(text). */
  key: string;
  translation: string;
  /** Newest first. */
  contexts: Context[];
  createdAt: number;
  updatedAt: number;
}

export interface EntryDraft {
  text: string;
  translation: string;
  context: Context | null;
}

export interface Settings {
  highlightEnabled: boolean;
  floatingButton: boolean;
  /** Hostnames where highlighting is off. */
  excludedSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  highlightEnabled: true,
  floatingButton: true,
  excludedSites: [],
};
