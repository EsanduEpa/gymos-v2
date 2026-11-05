export type Appearance = 'light' | 'dark';
export const APPEARANCE_KEY = 'gymos-appearance';
const CHANGE_EVENT = 'gymos-appearance-change';

// Runs in the document head before the workspace paints. Only display
// preferences are stored here; identity, tenant and support state stay server-held.
export const appearanceInitScript = `(function(){try{var mode=localStorage.getItem('gymos-appearance');document.documentElement.dataset.appearance=mode==='dark'?'dark':'light';document.documentElement.dataset.platformSidebar=localStorage.getItem('gymos-platform-sidebar')==='collapsed'?'collapsed':'expanded'}catch(e){document.documentElement.dataset.appearance='light'}})()`;

export function currentAppearance(): Appearance {
  return document.documentElement.dataset.appearance === 'dark' ? 'dark' : 'light';
}

export function setAppearance(mode: Appearance) {
  document.documentElement.dataset.appearance = mode;
  try { localStorage.setItem(APPEARANCE_KEY, mode); } catch { /* Keep this document usable when persistence is blocked. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAppearance(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_KEY && event.key !== null) return;
    document.documentElement.dataset.appearance = event.newValue === 'dark' ? 'dark' : 'light';
    listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', sync);
  };
}

export function sidebarIsCollapsed() {
  return document.documentElement.dataset.platformSidebar === 'collapsed';
}

export function togglePlatformSidebar() {
  const next = sidebarIsCollapsed() ? 'expanded' : 'collapsed';
  document.documentElement.dataset.platformSidebar = next;
  try { localStorage.setItem('gymos-platform-sidebar', next); } catch { /* Display preference only. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
