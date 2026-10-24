// version.js: the game version. Claude bumps it with every change (see CLAUDE.md "Versions").
// While STAGE is not 'FINAL', every screen shows the beta badge and the disclaimer.

export const VERSION = '0.11.0';
export const STAGE = 'BETA'; // 'ALPHA' | 'BETA' | 'RC' | 'FINAL'
export const DISCLAIMER = 'NOT THE FINAL GAME';

export function versionLabel() {
  return STAGE === 'FINAL' ? `v${VERSION}` : `${STAGE} v${VERSION}`;
}
