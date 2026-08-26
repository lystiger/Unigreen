/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node utility */
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "../public/images/products/usable");
const output = path.join(root, "cutouts");
const files = [
  "Gemini_Generated_Image_988hc6988hc6988h.png",
  "Gemini_Generated_Image_ck5ut4ck5ut4ck5u.png",
  "Gemini_Generated_Image_h99e50h99e50h99e.png",
  "Gemini_Generated_Image_qtdxibqtdxibqtdx.png",
  "Gemini_Generated_Image_ri79s5ri79s5ri79.png",
  "napkins1000.png",
  "napkins500.png",
];

const edgePoints = (width, height) => {
  const points = [];
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 80))) {
    points.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 80))) {
    points.push([0, y], [width - 1, y]);
  }
  return points;
};

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function processFile(file) {
  const source = path.join(root, file);
  const { data, info } = await sharp(source)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const alpha = Buffer.alloc(pixelCount, 255);
  const samples = edgePoints(info.width, info.height).map(([x, y]) => {
    const offset = (y * info.width + x) * channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  });
  const background = samples.slice(0, 32);
  const queue = [];

  for (const [x, y] of edgePoints(info.width, info.height)) {
    const index = y * info.width + x;
    if (!visited[index]) queue.push(index);
  }

  while (queue.length) {
    const index = queue.pop();
    if (visited[index]) continue;
    visited[index] = 1;
    const offset = index * channels;
    const rgb = [data[offset], data[offset + 1], data[offset + 2]];
    const nearest = Math.min(...background.map((sample) => distance(rgb, sample)));
    if (nearest > 78) continue;
    alpha[index] = Math.max(0, Math.round((nearest / 78) * 255));
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    if (x > 0) queue.push(index - 1);
    if (x < info.width - 1) queue.push(index + 1);
    if (y > 0) queue.push(index - info.width);
    if (y < info.height - 1) queue.push(index + info.width);
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  for (let i = 0; i < pixelCount; i += 1) {
    const sourceOffset = i * channels;
    const targetOffset = i * 4;
    rgba[targetOffset] = data[sourceOffset];
    rgba[targetOffset + 1] = data[sourceOffset + 1];
    rgba[targetOffset + 2] = data[sourceOffset + 2];
    rgba[targetOffset + 3] = alpha[i];
  }

  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(path.join(output, file));
  console.log(`created ${path.join("cutouts", file)}`);
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  for (const file of files) await processFile(file);
})();
