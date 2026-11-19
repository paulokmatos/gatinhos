/**
 * Gatinho preto de olhos verdes (mascote do canvas "Capivarando").
 * Os gradientes (#k-*) ficam definidos uma vez no index.html.
 */
const EARS = `
<path d="M10 54 Q5 26 14 7 Q17 1 23 5 Q36 15 47 30 Z" fill="url(#k-fur)"/>
<path d="M17 43 Q14 24 19 12 Q30 19 39 31 Z" fill="url(#k-ear)"/>
<path d="M90 54 Q95 26 86 7 Q83 1 77 5 Q64 15 53 30 Z" fill="url(#k-fur)"/>
<path d="M83 43 Q86 24 81 12 Q70 19 61 31 Z" fill="url(#k-ear)"/>
<path d="M50 27 C70 27 86 33 90 50 C94 64 96 80 82 88 C72 93 60 94 50 94 C40 94 28 93 18 88 C4 80 6 64 10 50 C14 33 30 27 50 27 Z" fill="url(#k-fur)"/>`;
const WHISKERS = `<path d="M27 72 L8 69 M27 75.5 L9 77.5 M73 72 L92 69 M73 75.5 L91 77.5" stroke="#DADAE2" stroke-width="1.2" stroke-linecap="round"/>`;
const NOSE = `<path d="M45.5 69 Q50 66.5 54.5 69 Q53 73 50 74 Q47 73 45.5 69 Z" fill="#050507"/>`;
const SMILE = `<path d="M50 73 Q50 80 43 82 M50 73 Q50 80 57 82" stroke="#D0D0DA" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
const EYE = (cx: number, cy: number) => `<ellipse cx="${cx}" cy="${cy}" rx="11.5" ry="12.5" fill="url(#k-eyeg)" stroke="#060608" stroke-width="1.4"/>`;

const svg = (size: number, inner: string, label?: string) =>
  `<svg viewBox="0 0 100 100" width="${size}" height="${size}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} style="display:block">${inner}</svg>`;

export const catFace = (size: number) =>
  svg(
    size,
    `${EARS}
${EYE(33, 55)}<ellipse cx="34.5" cy="56" rx="5.5" ry="8.5" fill="url(#k-iris)"/><circle cx="38" cy="51.5" r="3.6" fill="#FFF"/><circle cx="31.5" cy="60.5" r="1.6" fill="#FFF"/>
${EYE(67, 55)}<ellipse cx="65.5" cy="56" rx="5.5" ry="8.5" fill="url(#k-iris)"/><circle cx="69" cy="51.5" r="3.6" fill="#FFF"/><circle cx="62.5" cy="60.5" r="1.6" fill="#FFF"/>
${NOSE}${SMILE}${WHISKERS}`,
  );

/** Carinha minúscula para a bolinha de cor já achada. */
export const catDot = (size: number) =>
  svg(size, `<path d="M10 54 Q5 26 14 7 Q17 1 23 5 Q36 15 47 30 Z" fill="url(#k-fur)"/><path d="M90 54 Q95 26 86 7 Q83 1 77 5 Q64 15 53 30 Z" fill="url(#k-fur)"/><path d="M50 27 C70 27 86 33 90 50 C94 64 96 80 82 88 C72 93 60 94 50 94 C40 94 28 93 18 88 C4 80 6 64 10 50 C14 33 30 27 50 27 Z" fill="url(#k-fur)"/><circle cx="34" cy="55" r="7" fill="#5CC24E"/><circle cx="66" cy="55" r="7" fill="#5CC24E"/>`);

export const catHint = (size: number) =>
  svg(
    size,
    `${EARS}
${EYE(33, 55)}<ellipse cx="36" cy="53" rx="5.3" ry="8.6" fill="url(#k-iris)"/><circle cx="39" cy="49" r="3.4" fill="#FFF"/>
${EYE(67, 55)}<ellipse cx="70" cy="53" rx="5.3" ry="8.6" fill="url(#k-iris)"/><circle cx="73" cy="49" r="3.4" fill="#FFF"/>
${NOSE}${SMILE}${WHISKERS}`,
    'Gatinho dando uma dica',
  );

export const catSad = (size: number) =>
  svg(
    size,
    `${EARS}
${EYE(33, 55)}<ellipse cx="33" cy="58" rx="4.3" ry="6.3" fill="#17171B"/><circle cx="36" cy="54" r="3" fill="#FFF"/>
${EYE(67, 55)}<ellipse cx="67" cy="58" rx="4.3" ry="6.3" fill="#17171B"/><circle cx="70" cy="54" r="3" fill="#FFF"/>
${NOSE}<path d="M40 83 Q50 74 60 83" stroke="#D0D0DA" stroke-width="2.8" fill="none" stroke-linecap="round"/>${WHISKERS}`,
    'Gatinho preocupado',
  );

export const catCheer = (size: number) =>
  svg(
    size,
    `${EARS}
<path d="M24 57 Q33 47 42 57" stroke="#8EE06A" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<path d="M58 57 Q67 47 76 57" stroke="#8EE06A" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<path d="M45.5 67 Q50 64.5 54.5 67 Q53 71 50 72 Q47 71 45.5 67 Z" fill="#050507"/>
<path d="M42 75 Q50 86 58 75 Z" fill="#B23A55" stroke="#A4A4B0" stroke-width="1.6" stroke-linejoin="round"/>
<ellipse cx="50" cy="80.5" rx="4" ry="2" fill="#FF9AB0"/>${WHISKERS}`,
    'Gatinho comemorando',
  );
