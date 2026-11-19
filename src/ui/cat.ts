/** Gatinho frajola do design. Os gradientes (#k-*) ficam definidos uma vez no index.html. */
const BODY = `
<path d="M12 52 Q9 22 20 8 Q24 4 29 8 L47 27 Z" fill="url(#k-fur)"/>
<path d="M19 43 Q17 24 23 15 L39 29 Z" fill="url(#k-ear)"/>
<path d="M88 52 Q91 22 80 8 Q76 4 71 8 L53 27 Z" fill="url(#k-fur)"/>
<path d="M81 43 Q83 24 77 15 L61 29 Z" fill="url(#k-ear)"/>
<ellipse cx="50" cy="58" rx="41" ry="35" fill="url(#k-fur)"/>
<path d="M50 32 Q44 44 41 52 Q27 55 23 68 Q23 89 50 92 Q77 89 77 68 Q73 55 59 52 Q56 44 50 32 Z" fill="url(#k-white)"/>`;
const WHISKERS = `<path d="M27 72 L8 69 M27 75.5 L9 77.5 M73 72 L92 69 M73 75.5 L91 77.5" stroke="#9A9AA4" stroke-width="1.2" stroke-linecap="round"/>`;

const svg = (size: number, inner: string, label?: string) =>
  `<svg viewBox="0 0 100 100" width="${size}" height="${size}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} style="display:block">${inner}</svg>`;

export const catFace = (size: number) =>
  svg(
    size,
    `${BODY}
<ellipse cx="33" cy="55" rx="11.5" ry="12.5" fill="#FFF" stroke="#1A1A1E" stroke-width="1"/><ellipse cx="34.5" cy="56" rx="9" ry="10" fill="url(#k-iris)"/>
<circle cx="38" cy="51.5" r="3.6" fill="#FFF"/><circle cx="31.5" cy="60.5" r="1.6" fill="#FFF"/>
<ellipse cx="67" cy="55" rx="11.5" ry="12.5" fill="#FFF" stroke="#1A1A1E" stroke-width="1"/><ellipse cx="65.5" cy="56" rx="9" ry="10" fill="url(#k-iris)"/>
<circle cx="69" cy="51.5" r="3.6" fill="#FFF"/><circle cx="62.5" cy="60.5" r="1.6" fill="#FFF"/>
<ellipse cx="29" cy="72" rx="5" ry="2.6" fill="#F7A1B5" opacity=".45"/><ellipse cx="71" cy="72" rx="5" ry="2.6" fill="#F7A1B5" opacity=".45"/>
<path d="M45.5 69 Q50 66.5 54.5 69 Q53 73 50 74 Q47 73 45.5 69 Z" fill="#F590A8"/>
<path d="M50 74 Q50 77.5 46.5 78.5 M50 74 Q50 77.5 53.5 78.5" stroke="#3A3A40" stroke-width="1.6" fill="none" stroke-linecap="round"/>${WHISKERS}`,
  );

export const catHint = (size: number) =>
  svg(
    size,
    `${BODY}
<ellipse cx="33" cy="55" rx="11.5" ry="12.5" fill="#FFF" stroke="#1A1A1E" stroke-width="1"/><ellipse cx="36" cy="53" rx="8.5" ry="9.5" fill="url(#k-iris)"/><circle cx="39" cy="49" r="3.4" fill="#FFF"/>
<ellipse cx="67" cy="55" rx="11.5" ry="12.5" fill="#FFF" stroke="#1A1A1E" stroke-width="1"/><ellipse cx="70" cy="53" rx="8.5" ry="9.5" fill="url(#k-iris)"/><circle cx="73" cy="49" r="3.4" fill="#FFF"/>
<path d="M45.5 69 Q50 66.5 54.5 69 Q53 73 50 74 Q47 73 45.5 69 Z" fill="#F590A8"/>
<path d="M50 74 Q50 77.5 46.5 78.5 M50 74 Q50 77.5 53.5 78.5" stroke="#3A3A40" stroke-width="1.6" fill="none" stroke-linecap="round"/>${WHISKERS}`,
    'Gatinho dando uma dica',
  );

export const catCheer = (size: number) =>
  svg(
    size,
    `${BODY}
<path d="M24 57 Q33 47 42 57" stroke="#1A1A1E" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<path d="M58 57 Q67 47 76 57" stroke="#1A1A1E" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<ellipse cx="29" cy="70" rx="6" ry="3.2" fill="#F7A1B5" opacity=".7"/><ellipse cx="71" cy="70" rx="6" ry="3.2" fill="#F7A1B5" opacity=".7"/>
<path d="M45.5 67 Q50 64.5 54.5 67 Q53 71 50 72 Q47 71 45.5 67 Z" fill="#F590A8"/>
<path d="M42 75 Q50 86 58 75 Z" fill="#B23A55" stroke="#3A3A40" stroke-width="1.6" stroke-linejoin="round"/>
<ellipse cx="50" cy="80.5" rx="4" ry="2" fill="#FF9AB0"/>${WHISKERS}`,
    'Gatinho comemorando',
  );
