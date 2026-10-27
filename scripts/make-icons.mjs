// Renders public/icon/{16,32,48,128,300}.png from scripts/icon.svg.
// Original artwork: a cloud silhouette over waveform bars. Deliberately not
// SoundCloud's logo, to stay clear of trademark policy on both stores.
import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const svg = await readFile(join(here, "icon.svg"), "utf8");
const outDir = join(here, "..", "public", "icon");
await mkdir(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  await writeFile(join(outDir, `${size}.png`), png);
  console.log(`icon/${size}.png`);
}

// Toolbar variants with a small play / pause mark in the corner, used instead
// of badge text so the icon stays recognisable. 128 is not needed for the action.
const marks = {
  playing: `<path d="M90 86 L90 114 L114 100 Z" fill="#ffffff"/>`,
  paused: `<rect x="88" y="87" width="8" height="26" rx="2" fill="#ffffff"/><rect x="104" y="87" width="8" height="26" rx="2" fill="#ffffff"/>`,
};
for (const [variant, mark] of Object.entries(marks)) {
  const overlay = svg.replace(
    "</svg>",
    `<circle cx="100" cy="100" r="27" fill="#111111" stroke="#ffffff" stroke-width="4"/>${mark}</svg>`,
  );
  for (const size of [16, 32, 48]) {
    const png = new Resvg(overlay, { fitTo: { mode: "width", value: size } }).render().asPng();
    await writeFile(join(outDir, `${size}-${variant}.png`), png);
    console.log(`icon/${size}-${variant}.png`);
  }
}

// Edge Partner Center wants a 300x300 logo; keep it out of the packaged extension.
const storeDir = join(here, "..", "docs", "store-assets");
await mkdir(storeDir, { recursive: true });
await writeFile(
  join(storeDir, "icon-300.png"),
  new Resvg(svg, { fitTo: { mode: "width", value: 300 } }).render().asPng(),
);
console.log("docs/store-assets/icon-300.png");
