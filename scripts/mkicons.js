const sharp = require("sharp");
const fs = require("fs");

const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB300"/><stop offset="1" stop-color="#FF4D00"/></linearGradient></defs>`;

// standard icon (rounded square)
const rounded = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${grad}<rect width="${s}" height="${s}" rx="${s*0.225}" fill="url(#g)"/><path d="M${s*0.39} ${s*0.27} L${s*0.77} ${s*0.5} L${s*0.39} ${s*0.73} Z" fill="#fff"/></svg>`;

// maskable: full-bleed background, content inside 80% safe zone
const maskable = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${grad}<rect width="${s}" height="${s}" fill="url(#g)"/><path d="M${s*0.44} ${s*0.345} L${s*0.70} ${s*0.5} L${s*0.44} ${s*0.655} Z" fill="#fff"/></svg>`;

const out = "/home/user/streambox/public/icons/";
(async () => {
  await sharp(Buffer.from(rounded(512))).png().toFile(out + "icon-512.png");
  await sharp(Buffer.from(rounded(192))).png().toFile(out + "icon-192.png");
  await sharp(Buffer.from(rounded(180))).png().toFile(out + "apple-touch-icon.png");
  await sharp(Buffer.from(maskable(512))).png().toFile(out + "icon-maskable-512.png");
  fs.writeFileSync("/home/user/streambox/app/icon.svg", rounded(64));
  console.log("icons done");
})().catch(e => { console.error(e); process.exit(1); });
