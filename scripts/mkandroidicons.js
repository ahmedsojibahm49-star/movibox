const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const RES = path.join(__dirname, "..", "android", "app", "src", "main", "res");

const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB300"/><stop offset="1" stop-color="#FF4D00"/></linearGradient></defs>`;
// full icon (rounded square, transparent outside) at 512
const icon512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${grad}<rect width="512" height="512" rx="115" fill="url(#g)"/><path d="M200 138 L392 256 L200 374 Z" fill="#fff"/></svg>`;
// adaptive foreground: transparent bg, triangle in 66/108 safe zone
const fg = (s) => {
  const u = s / 108; // unit
  const x = (v) => (v * u).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><path d="M${x(40)} ${x(25)} L${x(73)} ${x(54)} L${x(40)} ${x(83)} Z" fill="#fff"/></svg>`;
};
// splash: dark bg + centered icon
const splash = (w, h) => {
  const icon = Math.round(Math.min(w, h) * 0.36);
  const x = Math.round((w - icon) / 2);
  const y = Math.round((h - icon) / 2 - h * 0.04);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#050505"/><g transform="translate(${x} ${y}) scale(${icon / 512})"><svg width="512" height="512">${grad}<rect width="512" height="512" rx="115" fill="url(#g)"/><path d="M200 138 L392 256 L200 374 Z" fill="#fff"/></svg></g></svg>`;
};

const densities = { "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192 };
const fgSizes = { "mipmap-mdpi": 108, "mipmap-hdpi": 162, "mipmap-xhdpi": 216, "mipmap-xxhdpi": 288, "mipmap-xxxhdpi": 384 };
const splashSizes = {
  "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800], "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [1080, 1920], "drawable-port-xxxhdpi": [1440, 2560],
  "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480], "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1920, 1080], "drawable-land-xxxhdpi": [2560, 1440],
};

(async () => {
  const iconBase = await sharp(Buffer.from(icon512)).png().toBuffer();
  for (const [dir, size] of Object.entries(densities)) {
    const target = await sharp(iconBase).resize(size, size).png().toBuffer();
    await sharp(target).toFile(path.join(RES, dir, "ic_launcher.png"));
    await sharp(target).toFile(path.join(RES, dir, "ic_launcher_round.png"));
    await sharp(Buffer.from(fg(fgSizes[dir]))).png().toFile(path.join(RES, dir, "ic_launcher_foreground.png"));
  }
  for (const [dir, [w, h]] of Object.entries(splashSizes)) {
    await sharp(Buffer.from(splash(w, h))).png().toFile(path.join(RES, dir, "splash.png"));
  }
  const colors = path.join(RES, "values", "ic_launcher_background.xml");
  fs.writeFileSync(colors, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FF7A1A</color>\n</resources>\n');
  console.log("android icons done");
})().catch((e) => { console.error(e); process.exit(1); });
