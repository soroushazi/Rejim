/** Light / Dark / Device (follow the OS) appearance. A per-device display
 * choice kept in localStorage, not a server-side UserPreference: it has to
 * apply before login and before first paint (index.html's inline script
 * mirrors resolveDark() below - keep the two in sync), and "Device" is
 * inherently per-device anyway. */
export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'rejim_theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage unavailable (private mode, ...) - fall through to the default.
  }
  return 'system'
}

function resolveDark(pref: ThemePreference): boolean {
  return pref === 'dark' || (pref === 'system' && darkQuery().matches)
}

function applyTheme(pref: ThemePreference) {
  document.documentElement.classList.toggle('dark', resolveDark(pref))
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Still applies for this session even if it can't be remembered.
  }
  applyTheme(pref)
}

/** Applies the saved choice and keeps "Device" in step with OS changes
 * (e.g. iOS switching to dark at sunset) while the app is open. */
export function initTheme() {
  applyTheme(getThemePreference())
  darkQuery().addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme('system')
  })
}
