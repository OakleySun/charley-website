const fs = require("fs");
const path = require("path");
const vm = require("vm");
const sharp = require("sharp");

const root = __dirname;
const sandbox = { window: {} };
const pageData = fs.readFileSync(path.join(root, "page-data.js"), "utf8");
vm.runInNewContext(pageData, sandbox, { filename: "page-data.js" });

const density = 2;
const variants = new Map();

const percent = (value) => Number.parseFloat(value) / 100;
const renderedSize = (item) => {
  if (item.sprite) {
    return {
      width: item.w * percent(item.sprite.width),
      height: item.h * percent(item.sprite.height),
    };
  }

  if (item.inner) return { width: item.inner.w, height: item.inner.h };
  return { width: item.w, height: item.h };
};

for (const design of Object.values(sandbox.window.portfolioDesigns)) {
  for (const item of design.layers) {
    if (item.type !== "image") continue;

    const key = `${design.assetFolder}/${item.src}`;
    const size = renderedSize(item);
    const current = variants.get(key) || {
      folder: design.assetFolder,
      src: item.src,
      width: 0,
      height: 0,
      preview: false,
      opacity: 1,
    };
    current.width = Math.max(current.width, size.width * density);
    current.height = Math.max(current.height, size.height * density);
    current.preview ||= Boolean(item.preview);
    current.opacity = Math.min(current.opacity, item.opacity ?? 1);
    variants.set(key, current);
  }
}

const displayName = (src) => src.replace(/\.[^.]+$/, ".display.webp");

const build = async (variant) => {
  const source = path.join(root, "assets", "layers", variant.folder, variant.src);
  const output = path.join(root, "assets", "layers", variant.folder, displayName(variant.src));
  const metadata = await sharp(source).metadata();
  const naturalWidth = metadata.width;
  const naturalHeight = metadata.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error(`Unable to read dimensions for ${source}`);
  }

  const scale = Math.min(
    1,
    Math.max(variant.width / naturalWidth, variant.height / naturalHeight),
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const quality = variant.preview ? 90 : variant.opacity < 0.5 ? 82 : 87;

  await sharp(source)
    .resize(width, height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    })
    .webp({
      quality,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(output);

  const outputBytes = fs.statSync(output).size;
  return {
    sourceBytes: fs.statSync(source).size,
    outputBytes,
    output: path.relative(root, output),
    width,
    height,
  };
};

(async () => {
  const results = [];
  for (const variant of variants.values()) results.push(await build(variant));

  const originalBytes = results.reduce((sum, result) => sum + result.sourceBytes, 0);
  const displayBytes = results.reduce((sum, result) => sum + result.outputBytes, 0);
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);

  console.log(`Created ${results.length} display assets.`);
  console.log(`Referenced originals: ${mb(originalBytes)} MB`);
  console.log(`Display variants: ${mb(displayBytes)} MB`);
  console.log(`Reduction: ${Math.round((1 - displayBytes / originalBytes) * 100)}%`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
