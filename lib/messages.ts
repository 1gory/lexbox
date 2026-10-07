/** Messages sent from background/popup to the content script. */
export type Message = { type: 'open-save-card' } | { type: 'get-page-info' };

export interface PageInfo {
  host: string;
}
