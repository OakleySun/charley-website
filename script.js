const pageName = document.body.dataset.page;
const design = window.portfolioDesigns?.[pageName];
const stage = document.querySelector(".stage");

const px = (value) => `${value}px`;

const applyBox = (element, item) => {
  element.style.left = px(item.x);
  element.style.top = px(item.y);
  element.style.width = px(item.w);
  element.style.height = px(item.h);

  if (item.opacity !== undefined) element.style.opacity = item.opacity;
  if (item.z !== undefined) element.style.zIndex = item.z;
  if (item.border) element.style.border = item.border;
  if (item.background) element.style.background = item.background;
  if (item.shadow) element.style.boxShadow = item.shadow;
  if (item.rotate) element.style.transform = `rotate(${item.rotate}deg)`;
};

const createImage = (item, assetRoot) => {
  if (item.sprite) {
    const frame = document.createElement("div");
    const image = document.createElement("img");
    frame.className = "layer sprite-layer";
    image.src = `${assetRoot}/${item.src}`;
    image.alt = item.alt || "";
    image.draggable = false;
    Object.assign(image.style, item.sprite);
    frame.append(image);
    applyBox(frame, item);
    return frame;
  }

  if (item.inner) {
    const frame = document.createElement("div");
    const image = document.createElement("img");
    frame.className = "layer image-layer";
    image.src = `${assetRoot}/${item.src}`;
    image.alt = item.alt || "";
    image.draggable = false;
    image.style.width = px(item.inner.w);
    image.style.height = px(item.inner.h);
    image.style.objectFit = item.fit || "cover";
    if (item.position) image.style.objectPosition = item.position;
    image.style.transform = `translate(-50%, -50%) rotate(${item.inner.rotate || 0}deg)`;
    frame.append(image);
    applyBox(frame, item);
    return frame;
  }

  const image = document.createElement("img");
  image.className = "layer";
  image.src = `${assetRoot}/${item.src}`;
  image.alt = item.alt || "";
  image.draggable = false;
  image.style.objectFit = item.fit || "cover";
  if (item.position) image.style.objectPosition = item.position;
  applyBox(image, item);
  return image;
};

const createText = (item) => {
  const element = document.createElement(item.href ? "a" : "div");
  element.className = `layer text-layer${item.href ? " page-link" : ""}`;
  element.innerHTML = item.html;
  if (item.href) element.href = item.href;
  if (item.label) element.setAttribute("aria-label", item.label);
  element.style.fontFamily = item.font === "display"
    ? "var(--display)"
    : item.font === "display-text"
      ? "var(--display-text)"
      : item.font === "note"
        ? "var(--note)"
        : item.font === "symbol"
          ? '"Kaisei Opti", serif'
          : "var(--body)";
  element.style.fontSize = px(item.size);
  element.style.fontWeight = item.weight || 300;
  element.style.fontStyle = item.italic ? "italic" : "normal";
  element.style.lineHeight = item.lineHeight ? px(item.lineHeight) : "normal";
  element.style.letterSpacing = item.letterSpacing ? px(item.letterSpacing) : "0";
  element.style.textAlign = item.align || "left";
  element.style.color = item.color || "var(--ink)";
  applyBox(element, item);
  return element;
};

const createLine = (item, assetRoot) => {
  const image = document.createElement("img");
  image.className = "layer";
  image.src = `${assetRoot}/${item.src}`;
  image.alt = "";
  image.draggable = false;
  image.style.left = px(item.cx);
  image.style.top = px(item.cy);
  image.style.width = px(item.length);
  image.style.height = px(item.thickness || 1);
  image.style.transform = `translate(-50%, -50%) rotate(${item.angle}deg)`;
  image.style.transformOrigin = "center";
  if (item.opacity !== undefined) image.style.opacity = item.opacity;
  return image;
};

const renderLayer = (item, assetRoot) => {
  if (item.type === "image") return createImage(item, assetRoot);
  if (item.type === "text") return createText(item);
  if (item.type === "line") return createLine(item, assetRoot);

  const shape = document.createElement("div");
  shape.className = "layer";
  applyBox(shape, item);
  return shape;
};

const fitStage = () => {
  const scale = Math.min(window.innerWidth / 1200, window.innerHeight / 832);
  document.documentElement.style.setProperty("--stage-scale", String(scale));
};

if (!design || !stage) {
  throw new Error(`Missing portfolio design data for ${pageName}`);
}

const assetRoot = `assets/layers/${design.assetFolder}`;
const fragment = document.createDocumentFragment();
design.layers.forEach((item) => fragment.append(renderLayer(item, assetRoot)));
stage.append(fragment);

fitStage();
window.addEventListener("resize", fitStage, { passive: true });
