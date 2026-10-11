const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.style = { setProperty() {} };
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.classList = { add() {}, remove() {} };
  }

  append(...children) { this.children.push(...children); }
  addEventListener() {}
  setAttribute(name, value) { this.attributes[name] = value; }
  querySelectorAll() { return []; }
}

const stage = new Element("main");
const document = {
  body: new Element("body"),
  documentElement: new Element("html"),
  createElement: (name) => new Element(name),
  createDocumentFragment: () => new Element("fragment"),
  querySelector: (selector) => selector === ".stage" ? stage : null,
  querySelectorAll: () => [],
  addEventListener() {},
};
document.body.dataset.page = "landing";
const window = {
  innerWidth: 1200,
  innerHeight: 832,
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
};
const context = vm.createContext({ document, window });
const root = path.resolve(__dirname, "..");
vm.runInContext(fs.readFileSync(path.join(root, "page-data.js"), "utf8"), context);
window.portfolioDesigns.landing.layers = [];
vm.runInContext(fs.readFileSync(path.join(root, "script.js"), "utf8"), context);
const api = vm.runInContext("({ createImageFrame, createLine, applyBox, makePreviewable })", context);

const frameFor = (item) => {
  const image = new Element("img");
  const frame = api.createImageFrame(item, image);
  api.applyBox(frame, { ...item, x: 0, y: 0 });
  return { image, frame };
};

test("preview metadata retains the thumbnail's appearance and exact frame", () => {
  const item = {
    src: "poster.png", preview: true, w: 145, h: 36,
    fit: "cover", position: "bottom", opacity: 0.8,
    border: "0.5px solid #000", background: "transparent",
    shadow: "0 4px 4px rgb(0 0 0 / 25%)", rotate: -6,
  };
  const { frame } = frameFor(item);
  api.makePreviewable(frame, item, "assets");
  const box = JSON.parse(frame.dataset.previewBox);
  for (const key of ["w", "h", "fit", "position", "opacity", "border", "background", "shadow", "rotate"]) {
    assert.equal(box[key], item[key]);
  }
});

test("sprite crops keep their percentage offsets instead of revealing the source", () => {
  const item = {
    w: 208, h: 137,
    sprite: { width: "150.95%", height: "158.18%", left: "-39.55%", top: "-0.09%" },
  };
  const { frame, image } = frameFor(item);
  assert.equal(frame.className, "layer sprite-layer");
  assert.equal(frame.style.width, "208px");
  assert.equal(frame.style.height, "137px");
  assert.equal(image.style.width, "150.95%");
  assert.equal(image.style.height, "auto");
  assert.equal(image.style.left, "-39.55%");
  assert.equal(image.style.top, "-0.09%");
});

test("rotated artwork keeps its original inner dimensions and rotation", () => {
  const { frame, image } = frameFor({ w: 146.037, h: 144.57, inner: { w: 111, h: 108, rotate: 24.77 } });
  assert.equal(frame.className, "layer image-layer");
  assert.equal(image.style.width, "111px");
  assert.equal(image.style.height, "108px");
  assert.equal(image.style.transform, "translate(-50%, -50%) rotate(24.77deg)");
});

test("nested sprite crops keep the rotated crop wrapper", () => {
  const { frame, image } = frameFor({
    w: 52.04, h: 93.291,
    inner: { w: 47.827, h: 91.153, rotate: -2.68 },
    sprite: { width: "303.53%", left: "-195.29%", top: "-4.37%" },
  });
  const crop = frame.children[0];
  assert.equal(crop.style.width, "47.827px");
  assert.equal(crop.style.transform, "translate(-50%, -50%) rotate(-2.68deg)");
  assert.equal(crop.children[0], image);
  assert.equal(image.style.width, "303.53%");
});

test("contain and cover keep the specified frame and object position", () => {
  for (const fit of ["contain", "cover"]) {
    const { frame, image } = frameFor({ w: 90, h: 86, fit, position: "bottom" });
    assert.equal(frame, image);
    assert.equal(image.style.width, "90px");
    assert.equal(image.style.height, "86px");
    assert.equal(image.style.objectFit, fit);
    assert.equal(image.style.objectPosition, "bottom");
  }
});

test("clean original PNGs are shared by thumbnails and enlarged renders", () => {
  const renders = window.portfolioDesigns.profile.layers.filter((item) => item.src?.endsWith(".original.png"));
  assert.equal(renders.length, 3);
  for (const item of renders) {
    assert.equal(item.preview, true);
    assert.equal(item.previewSrc, undefined);
    assert.ok(fs.existsSync(path.join(root, "assets/layers/profile", item.src)));
    assert.ok(fs.existsSync(path.join(root, "assets/layers/profile", item.src.replace(/\.[^.]+$/, ".display.webp"))));
  }
  const portrait = window.portfolioDesigns.profile.layers.find((item) => item.alt === "Portrait of Charley");
  assert.equal(portrait.previewSrc, undefined);
});

test("Tattoos hairlines retain their Figma thickness on a larger SVG rendering surface", () => {
  const lines = window.portfolioDesigns.tattoos.layers.filter((item) => item.type === "line");
  assert.equal(lines.length, 6);
  for (const item of lines) {
    assert.equal(item.thickness, 0.3);
    assert.equal(item.renderScale, 16);
    const frame = api.createLine(item, "assets/layers/tattoos");
    const image = frame.children[0];
    assert.equal(frame.style.width, `${item.length}px`);
    assert.equal(frame.style.height, "0.3px");
    assert.equal(frame.style.transform, `translate(-50%, -50%) rotate(${item.angle}deg)`);
    assert.equal(image.style.width, `${item.length * 16}px`);
    assert.equal(image.style.height, "4.8px");
    assert.equal(image.style.transform, "scale(0.0625)");
    assert.equal(image.src, `assets/layers/tattoos/${item.src}`);
  }
});
