import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/products', { recursive: true });
const wrap = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600" viewBox="0 0 500 600"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#17202c" flood-opacity=".12"/></filter><linearGradient id="lens" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#565f69"/><stop offset=".35" stop-color="#101623"/><stop offset=".65" stop-color="#243046"/><stop offset="1" stop-color="#03060c"/></linearGradient><radialGradient id="glass"><stop stop-color="#4d6388"/><stop offset=".45" stop-color="#151e32"/><stop offset=".7" stop-color="#070c15"/><stop offset="1" stop-color="#273a51"/></radialGradient>${defs}</defs>${body}</svg>`;
const lens = (x, y, r = 31) =>
  `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="#9c9b95"/><circle cx="${x}" cy="${y}" r="${r + 2}" fill="#262a31"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#lens)"/><circle cx="${x}" cy="${y}" r="${r - 6}" fill="url(#glass)" stroke="#7890ac" stroke-opacity=".18"/><ellipse cx="${x - 9}" cy="${y - 11}" rx="9" ry="5" fill="#a0c7df" opacity=".13" transform="rotate(-35 ${x} ${y})"/><circle cx="${x + 5}" cy="${y + 5}" r="6" fill="#3e4761" opacity=".25"/>`;
function iphone(color1, color2) {
  return wrap(
    `<g filter="url(#shadow)"><rect x="116" y="52" width="268" height="502" rx="43" fill="#9e9387"/><rect x="119" y="54" width="262" height="499" rx="41" fill="url(#body)" stroke="#fff" stroke-opacity=".6"/><path d="M146 63h203" stroke="#fff" stroke-opacity=".4"/><rect x="115" y="146" width="3" height="34" rx="2" fill="#92887c"/><rect x="115" y="190" width="3" height="49" rx="2" fill="#92887c"/><rect x="382" y="186" width="3" height="64" rx="2" fill="#92887c"/><rect x="131" y="68" width="151" height="159" rx="34" fill="url(#camera)" stroke="#fff" stroke-opacity=".3"/><rect x="134" y="71" width="145" height="154" rx="31" fill="none" stroke="#726e63" stroke-opacity=".2"/>${lens(172, 112)}${lens(172, 185)}${lens(242, 149)}<circle cx="243" cy="91" r="11" fill="#eee8d8" stroke="#c3beb3"/><circle cx="243" cy="205" r="10" fill="#3d3935"/><circle cx="263" cy="183" r="3" fill="#5d5852"/><g transform="translate(231 296)" fill="#817a73" opacity=".42"><path d="M19 9c-6-7-16-7-23-3-11 6-12 21-7 34 4 10 9 17 14 17 5 0 8-4 14-4s8 4 13 4c6 0 11-9 15-19-12-5-15-20-5-27-8-9-15-8-21-2Z"/><path d="M19 5c1-10 7-17 17-18 0 10-6 17-17 18Z"/></g><path d="M146 544h202" stroke="#6d665d" opacity=".15"/></g>`,
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="${color1}"/><stop offset=".4" stop-color="${color2}"/><stop offset="1" stop-color="${color1}"/></linearGradient><linearGradient id="camera" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color1}"/><stop offset="1" stop-color="${color2}"/></linearGradient>`,
  );
}
await writeFile('public/products/iphone-pro.svg', iphone('#c9b29b', '#e2cdb9'));
await writeFile('public/products/iphone-blue.svg', iphone('#5f71b6', '#8c9bd4'));
function galaxy(a, b) {
  return wrap(
    `<g filter="url(#shadow)"><rect x="120" y="48" width="261" height="509" rx="24" fill="#7c858b"/><rect x="123" y="51" width="255" height="503" rx="22" fill="url(#body)" stroke="#fff" stroke-opacity=".6"/>${lens(164, 105, 29)}${lens(164, 180, 29)}${lens(164, 255, 29)}${lens(226, 137, 16)}${lens(226, 206, 16)}<circle cx="226" cy="89" r="8" fill="#eeebe3"/><rect x="379" y="139" width="3" height="57" rx="1" fill="#8e979d"/><rect x="379" y="215" width="3" height="40" rx="1" fill="#8e979d"/><text x="250" y="489" text-anchor="middle" font-family="Arial" font-size="14" letter-spacing="2" fill="#667681" opacity=".35">SAMSUNG</text><path d="M130 532h240" stroke="#fff" opacity=".2"/></g>`,
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>`,
  );
}
await writeFile('public/products/galaxy.svg', galaxy('#a9b4ba', '#d7dfe3'));
await writeFile('public/products/galaxy-green.svg', galaxy('#445a57', '#80958d'));
await writeFile(
  'public/products/pixel.svg',
  wrap(
    `<g filter="url(#shadow)"><rect x="119" y="53" width="263" height="500" rx="46" fill="#b5b4aa"/><rect x="122" y="56" width="257" height="495" rx="43" fill="url(#body)" stroke="#fff" stroke-opacity=".6"/><rect x="125" y="109" width="251" height="95" rx="45" fill="#c7c9c3" stroke="#f9f9ee"/><rect x="138" y="119" width="197" height="75" rx="35" fill="#343b3e"/>${lens(178, 157, 23)}${lens(241, 157, 23)}${lens(301, 157, 22)}<circle cx="353" cy="143" r="9" fill="#fbf9ee"/><circle cx="353" cy="171" r="5" fill="#777b77"/><text x="251" y="358" font-family="Arial" font-weight="600" font-size="48" text-anchor="middle" fill="#8c8e86" opacity=".45">G</text></g>`,
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d3d2c7"/><stop offset=".5" stop-color="#eeeee5"/><stop offset="1" stop-color="#d8d8cf"/></linearGradient>`,
  ),
);
await writeFile(
  'public/products/oneplus.svg',
  wrap(
    `<g filter="url(#shadow)"><rect x="120" y="50" width="260" height="505" rx="37" fill="#adbfc7"/><rect x="123" y="53" width="254" height="499" rx="35" fill="url(#body)" stroke="#fff" stroke-opacity=".65"/><path d="M143 63v478m7-478v478m195-478v478" stroke="#fff" opacity=".15"/><circle cx="205" cy="152" r="79" fill="#a3b6bf" stroke="#d9e4eb" stroke-width="4"/><circle cx="205" cy="152" r="73" fill="#3f505d"/>${lens(174, 117, 24)}${lens(238, 117, 24)}${lens(174, 182, 24)}<text x="238" y="190" text-anchor="middle" fill="#c4d2dc" font-family="Arial" font-size="22">H</text><circle cx="314" cy="111" r="9" fill="#ecede7"/><g transform="translate(231 330)" fill="none" stroke="#819aa8" stroke-width="3" opacity=".45"><path d="M0 0h31v33H0Z M12 10h5v15m-5 0h11M31 0h12m-6-6v12"/></g></g>`,
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bad0dc"/><stop offset=".5" stop-color="#e4edf2"/><stop offset="1" stop-color="#c0d3df"/></linearGradient>`,
  ),
);
await writeFile(
  'public/products/phone-front.svg',
  wrap(
    `<g filter="url(#shadow)"><rect x="116" y="48" width="268" height="509" rx="45" fill="#938e88"/><rect x="120" y="51" width="260" height="503" rx="43" fill="#101216"/><rect x="126" y="57" width="248" height="491" rx="38" fill="url(#wall)"/><g clip-path="url(#screen)"><path d="M80 470C195 366 395 361 424 191L460 600H65Z" fill="url(#wave1)"/><path d="M85 486C205 393 425 334 366 125C485 239 431 433 503 551L244 665Z" fill="#143f91"/><path d="M84 524C237 479 365 361 355 146C430 370 385 441 340 610Z" fill="url(#wave2)"/><path d="M100 590C295 559 369 410 355 146" stroke="#73aeff" stroke-opacity=".7" stroke-width="3" fill="none"/><path d="M350 157C282 192 158 140 118 213" stroke="#425687" stroke-opacity=".4" stroke-width="80" fill="none"/></g><rect x="205" y="69" width="91" height="25" rx="14" fill="#090c12"/><circle cx="280" cy="81" r="5" fill="#182335"/><rect x="212" y="532" width="79" height="3" rx="2" fill="#c6d6f6" opacity=".8"/></g>`,
    `<linearGradient id="wall" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#10172c"/><stop offset=".4" stop-color="#263958"/><stop offset="1" stop-color="#172546"/></linearGradient><linearGradient id="wave1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#415b97"/><stop offset=".5" stop-color="#7d9acf"/><stop offset="1" stop-color="#bdcff2"/></linearGradient><linearGradient id="wave2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#154594"/><stop offset=".4" stop-color="#4a7fd2"/><stop offset="1" stop-color="#a0c2fa"/></linearGradient><clipPath id="screen"><rect x="126" y="57" width="248" height="491" rx="38"/></clipPath>`,
  ),
);
await writeFile(
  'public/products/earbuds.svg',
  wrap(
    `<g filter="url(#shadow)"><path d="M117 312c0-52 38-79 82-79h103c51 0 82 30 82 79v63c0 45-29 72-76 72H196c-48 0-79-29-79-73Z" fill="url(#white)" stroke="#d9dce1" stroke-width="2"/><path d="M118 315h265" stroke="#d4d8df" stroke-width="2"/><path d="M125 310c0-47 34-70 77-70h102c45 0 70 22 72 69" stroke="white" stroke-width="4" fill="none"/><circle cx="250" cy="357" r="3" fill="#90b49b"/><path d="M204 427h92" stroke="#dae0e7" stroke-width="2"/><g transform="translate(138 107) rotate(-18)"><path d="M30 0c-28 0-40 23-30 48 6 15 20 22 34 18v83c0 14 22 14 22 0V32C56 11 46 0 30 0Z" fill="url(#white)" stroke="#d5d9df"/><ellipse cx="9" cy="27" rx="7" ry="13" fill="#262b34"/><path d="M36 77v48" stroke="#f5f6f8" stroke-width="6"/><rect x="36" y="37" width="7" height="17" rx="3" fill="#272d36"/><path d="M37 147h18" stroke="#c3cad4" stroke-width="3"/></g><g transform="translate(305 110) rotate(21)"><path d="M25 0c29 0 41 23 31 48-6 15-20 22-34 18v83c0 14-22 14-22 0V32C0 11 10 0 25 0Z" fill="url(#white)" stroke="#d5d9df"/><ellipse cx="48" cy="27" rx="7" ry="13" fill="#262b34"/><rect x="12" y="37" width="7" height="17" rx="3" fill="#272d36"/><path d="M2 147h18" stroke="#c3cad4" stroke-width="3"/></g></g>`,
    `<linearGradient id="white" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff"/><stop offset=".4" stop-color="#fdfdfd"/><stop offset="1" stop-color="#dce1e8"/></linearGradient>`,
  ),
);
await writeFile(
  'public/products/watch.svg',
  wrap(
    `<g filter="url(#shadow)"><path d="M188 29c25-11 98-11 121 0l10 207H177Z" fill="url(#band)"/><path d="M177 353h142l-10 207c-23 10-96 10-121 0Z" fill="url(#band)"/><path d="M198 63v121m100-121v121" stroke="#5b626c" opacity=".4"/><rect x="135" y="175" width="228" height="248" rx="60" fill="#53585f"/><rect x="141" y="181" width="216" height="236" rx="55" fill="#181c23" stroke="#90959d" stroke-opacity=".4"/><rect x="150" y="190" width="198" height="219" rx="47" fill="#05090e"/><rect x="363" y="227" width="15" height="42" rx="6" fill="#626972" stroke="#818994"/><path d="M367 233v31m4-31v31" stroke="#353b42"/><rect x="361" y="301" width="6" height="55" rx="3" fill="#414a57"/><circle cx="250" cy="295" r="78" stroke="#204632" stroke-width="11" fill="none"/><circle cx="250" cy="295" r="78" stroke="#72d09a" stroke-width="11" stroke-dasharray="390 490" fill="none" transform="rotate(-90 250 295)"/><circle cx="250" cy="295" r="61" stroke="#352540" stroke-width="11" fill="none"/><circle cx="250" cy="295" r="61" stroke="#c67abc" stroke-width="11" stroke-dasharray="275 383" fill="none" transform="rotate(-90 250 295)"/><circle cx="250" cy="295" r="44" stroke="#1a3448" stroke-width="11" fill="none"/><circle cx="250" cy="295" r="44" stroke="#74b9ee" stroke-width="11" stroke-dasharray="205 276" fill="none" transform="rotate(-90 250 295)"/><path d="M250 295l-12-30m12 30l32 7" stroke="#f4f7fb" stroke-width="4" stroke-linecap="round"/><circle cx="250" cy="295" r="5" fill="white"/><text x="250" y="380" text-anchor="middle" fill="#94a9c0" font-family="Arial" font-size="13">MON 10</text></g>`,
    `<linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#282e37"/><stop offset=".5" stop-color="#444b56"/><stop offset="1" stop-color="#242b34"/></linearGradient>`,
  ),
);
await writeFile(
  'public/products/charger.svg',
  wrap(
    `<g filter="url(#shadow)"><path d="M164 193v-79c0-8 15-8 15 0v79m41-2v-79c0-8 15-8 15 0v79" stroke="#b5bac2" stroke-width="13" stroke-linecap="round"/><path d="M123 199l179-37 83 56v228l-187 33-75-54Z" fill="#242a35"/><path d="M123 199l75 51v229l-75-54Z" fill="url(#side)"/><path d="M198 250l187-32v228l-187 33Z" fill="url(#face)"/><path d="M123 199l179-37 83 56-187 32Z" fill="#505b6c"/><path d="M125 202l72 50m4-2l180-31" stroke="#8090a9" opacity=".35"/><rect x="240" y="290" width="88" height="24" rx="10" fill="#111724" transform="rotate(-10 284 302)" stroke="#687689"/><rect x="240" y="337" width="88" height="24" rx="10" fill="#111724" transform="rotate(-10 284 349)" stroke="#687689"/><rect x="244" y="383" width="80" height="28" rx="3" fill="#192a40" transform="rotate(-10 284 397)" stroke="#62768f"/><path d="M253 397l62-11" stroke="#7b97bc" stroke-width="6"/><text x="154" y="357" text-anchor="middle" fill="#adb8c9" font-size="17" font-family="Arial" transform="rotate(33 154 357)">65W</text><text x="281" y="453" fill="#8996ab" text-anchor="middle" font-size="9" font-family="Arial" transform="rotate(-10 281 453)">GaN POWER</text></g>`,
    `<linearGradient id="face" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3f4959"/><stop offset="1" stop-color="#222b3b"/></linearGradient><linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#2b3341"/><stop offset="1" stop-color="#3d485b"/></linearGradient>`,
  ),
);
await writeFile(
  'public/products/case.svg',
  wrap(
    `<g filter="url(#shadow)"><rect x="120" y="53" width="260" height="500" rx="45" fill="#567189"/><rect x="124" y="57" width="252" height="492" rx="42" fill="url(#body)" stroke="#b5cbdd" stroke-opacity=".4"/><rect x="137" y="73" width="143" height="151" rx="29" fill="#40586c"/><rect x="143" y="80" width="131" height="137" rx="25" fill="#93a5b4"/>${lens(176, 118, 25)}${lens(176, 180, 25)}${lens(239, 149, 25)}<circle cx="239" cy="100" r="8" fill="#d7dedc"/><circle cx="239" cy="198" r="7" fill="#384653"/><circle cx="251" cy="363" r="74" fill="none" stroke="#c2d6e4" stroke-opacity=".35" stroke-width="10"/><path d="M251 445v40" stroke="#c2d6e4" stroke-opacity=".35" stroke-width="10" stroke-linecap="round"/><path d="M145 64h210" stroke="#d6e4ee" opacity=".3"/></g>`,
    `<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#667f94"/><stop offset=".4" stop-color="#87a1b6"/><stop offset="1" stop-color="#6b859c"/></linearGradient>`,
  ),
);
console.log('Generated 11 local product illustrations.');
