const pageName = document.body.dataset.page;
const design = window.portfolioDesigns?.[pageName];
const stage = document.querySelector(".stage");

const px = (value) => `${value}px`;
const displayAssetName = (src) => src.replace(/\.[^.]+$/, ".display.webp");

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

const makePreviewable = (element, item, assetRoot) => {
  if (item.preview || item.previewGroup) {
    element.addEventListener("pointerleave", () => element.classList.remove("preview-return-hover"));
  }

  if (item.previewGroup) {
    element.classList.add("preview-group-member");
    element.dataset.previewGroup = item.previewGroup;
    if (item.previewGroupOrigin) {
      element.style.transformOrigin = `${item.previewGroupOrigin.x - item.x}px ${item.previewGroupOrigin.y - item.y}px`;
    }
  }

  if (!item.preview) return element;

  const alt = item.alt || "Portfolio artwork";
  element.classList.add("artwork-trigger");
  element.addEventListener("blur", () => element.classList.remove("preview-return-focus"));
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `View larger: ${alt}`);
  element.setAttribute("aria-haspopup", "dialog");
  element.setAttribute("aria-controls", "artwork-lightbox");
  element.dataset.previewSrc = `${assetRoot}/${item.previewSrc || item.src}`;
  element.dataset.previewAlt = alt;
  if (item.previewLayers) {
    element.dataset.previewLayers = JSON.stringify(item.previewLayers.map((layer) => ({
      ...layer,
      src: `${assetRoot}/${layer.src}`,
    })));
  }
  return element;
};

const loadDisplayImage = (image, layer, item, assetRoot, priority) => {
  const targetOpacity = item.opacity ?? 1;
  const reveal = () => {
    const show = () => window.requestAnimationFrame(() => {
      layer.style.opacity = String(targetOpacity);
    });
    if (image.decode) image.decode().then(show, show);
    else show();
  };

  layer.classList.add("asset-layer");
  layer.style.opacity = "0";
  image.alt = item.alt || "";
  image.decoding = "async";
  image.draggable = false;
  image.fetchPriority = priority;
  image.loading = priority === "high" ? "eager" : "lazy";
  image.addEventListener("load", reveal, { once: true });
  image.addEventListener("error", () => {
    layer.style.opacity = String(targetOpacity);
  }, { once: true });
  image.src = `${assetRoot}/${displayAssetName(item.src)}`;
};

const createImage = (item, assetRoot, priority) => {
  if (item.sprite) {
    const frame = document.createElement("div");
    const image = document.createElement("img");
    frame.className = item.inner ? "layer" : "layer sprite-layer";

    if (item.inner) {
      const crop = document.createElement("div");
      crop.className = "sprite-layer";
      crop.style.position = "absolute";
      crop.style.top = "50%";
      crop.style.left = "50%";
      crop.style.width = px(item.inner.w);
      crop.style.height = px(item.inner.h);
      crop.style.transform = `translate(-50%, -50%) rotate(${item.inner.rotate || 0}deg)`;
      crop.style.transformOrigin = "center";
      Object.assign(image.style, item.sprite);
      crop.append(image);
      frame.append(crop);
    } else {
      Object.assign(image.style, item.sprite);
      frame.append(image);
    }

    image.style.height = "auto";
    applyBox(frame, item);
    loadDisplayImage(image, frame, item, assetRoot, priority);
    return makePreviewable(frame, item, assetRoot);
  }

  if (item.inner) {
    const frame = document.createElement("div");
    const image = document.createElement("img");
    frame.className = "layer image-layer";
    image.style.width = px(item.inner.w);
    image.style.height = px(item.inner.h);
    image.style.objectFit = item.fit || "cover";
    if (item.position) image.style.objectPosition = item.position;
    image.style.transform = `translate(-50%, -50%) rotate(${item.inner.rotate || 0}deg)`;
    frame.append(image);
    applyBox(frame, item);
    loadDisplayImage(image, frame, item, assetRoot, priority);
    return makePreviewable(frame, item, assetRoot);
  }

  const image = document.createElement("img");
  image.className = "layer";
  image.style.objectFit = item.fit || "cover";
  if (item.position) image.style.objectPosition = item.position;
  applyBox(image, item);
  loadDisplayImage(image, image, item, assetRoot, priority);
  return makePreviewable(image, item, assetRoot);
};

const createEffectText = (item, assetRoot) => {
  const image = document.createElement("img");
  image.className = "effect-text-image";
  image.alt = item.href ? "" : item.alt;
  image.decoding = "async";
  image.draggable = false;
  image.src = `${assetRoot}/${item.src}`;

  if (item.href) {
    const link = document.createElement("a");
    link.className = "layer page-link effect-text-link";
    link.href = item.href;
    link.setAttribute("aria-label", item.label || item.alt);
    link.append(image);
    applyBox(link, item);
    return link;
  }

  image.classList.add("layer");
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
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  image.fetchPriority = "low";
  image.loading = "lazy";
  image.src = `${assetRoot}/${item.src}`;
  image.style.left = px(item.cx);
  image.style.top = px(item.cy);
  image.style.width = px(item.length);
  image.style.height = px(item.thickness || 1);
  image.style.transform = `translate(-50%, -50%) rotate(${item.angle}deg)`;
  image.style.transformOrigin = "center";
  if (item.opacity !== undefined) image.style.opacity = item.opacity;
  return image;
};

const renderLayer = (item, assetRoot, priority = "low") => {
  if (item.type === "effect-text") return createEffectText(item, assetRoot);
  if (item.type === "image") return createImage(item, assetRoot, priority);
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

const selectPriorityImages = (targetDesign) => {
  const images = targetDesign.layers.filter((item) => item.type === "image");
  const selected = new Set(images.filter((item) => item.priority === "high"));
  const portfolioImages = images
    .filter((item) => item.preview && !selected.has(item))
    .sort((a, b) => (b.w * b.h) - (a.w * a.h));

  for (const item of portfolioImages) {
    if (selected.size >= 4) break;
    selected.add(item);
  }

  return selected;
};

const prepareLinkedPages = () => {
  const pageByFile = {
    "index.html": "landing",
    "graphic-design": "graphic-design",
    "graphic-design.html": "graphic-design",
    "clubs": "clubs",
    "clubs.html": "clubs",
    "tattoos": "tattoos",
    "tattoos.html": "tattoos",
    "profile": "profile",
    "profile.html": "profile",
  };
  const warmedAssets = new Map();

  const warm = (link) => {
    const file = new URL(link.href, window.location.href).pathname.split("/").pop() || "index.html";
    const targetDesign = window.portfolioDesigns?.[pageByFile[file]];
    if (!targetDesign) return;

    for (const item of selectPriorityImages(targetDesign)) {
      const src = `assets/layers/${targetDesign.assetFolder}/${displayAssetName(item.src)}`;
      if (warmedAssets.has(src)) continue;
      const preload = new Image();
      preload.decoding = "async";
      preload.fetchPriority = "low";
      preload.src = src;
      warmedAssets.set(src, preload);
    }
  };

  document.querySelectorAll(".site-nav a, .page-link").forEach((link) => {
    link.addEventListener("pointerenter", () => warm(link), { once: true });
    link.addEventListener("focus", () => warm(link), { once: true });
  });
};

const createLightbox = () => {
  const lightbox = document.createElement("div");
  const media = document.createElement("div");
  const image = document.createElement("img");
  const composite = document.createElement("div");
  const closeButton = document.createElement("button");
  const imageAnalysisCache = new Map();
  let activeTrigger = null;
  let activeSource = "";
  let activeLayers = null;
  let imageMetrics = null;
  let hideTimer = null;

  lightbox.className = "lightbox";
  lightbox.id = "artwork-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Enlarged portfolio image");

  media.className = "lightbox-media";
  image.className = "lightbox-image";
  image.decoding = "async";
  image.draggable = false;

  composite.className = "lightbox-composite";
  composite.hidden = true;
  composite.setAttribute("role", "img");

  closeButton.className = "lightbox-close";
  closeButton.type = "button";
  closeButton.title = "Close image";
  closeButton.setAttribute("aria-label", "Close enlarged image");

  media.append(image, composite);
  lightbox.append(media, closeButton);
  document.body.append(lightbox);

  const setPageInert = (inert) => {
    const screen = document.querySelector(".screen");
    const navigation = document.querySelector(".site-nav");
    screen?.toggleAttribute("inert", inert);
    navigation?.toggleAttribute("inert", inert);
  };

  const analyzeImage = () => {
    const fullImage = {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      transparent: false,
    };
    const sampleScale = Math.min(
      1,
      600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
    const height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return fullImage;
    canvas.width = width;
    canvas.height = height;

    try {
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      let transparentPixels = 0;

      for (let index = 3; index < pixels.length; index += 4) {
        const alpha = pixels[index];
        const pixel = (index - 3) / 4;
        const x = pixel % width;
        const y = Math.floor(pixel / width);

        if (alpha < 250) transparentPixels += 1;
        if (alpha <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      const transparent = transparentPixels / (width * height) > 0.005;
      if (!transparent || maxX < minX || maxY < minY) return fullImage;

      const inverseScale = 1 / sampleScale;
      const margin = 2 * inverseScale;
      const left = Math.max(0, minX * inverseScale - margin);
      const top = Math.max(0, minY * inverseScale - margin);
      const right = Math.min(image.naturalWidth, (maxX + 1) * inverseScale + margin);
      const bottom = Math.min(image.naturalHeight, (maxY + 1) * inverseScale + margin);

      return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        transparent: true,
      };
    } catch {
      return fullImage;
    }
  };

  const fitImage = () => {
    if (activeLayers) {
      const left = Math.min(...activeLayers.map((layer) => layer.x));
      const top = Math.min(...activeLayers.map((layer) => layer.y));
      const right = Math.max(...activeLayers.map((layer) => layer.x + layer.w));
      const bottom = Math.max(...activeLayers.map((layer) => layer.y + layer.h));
      const width = right - left;
      const height = bottom - top;
      const maxWidth = Math.min(window.innerWidth * 0.92, 1200);
      const maxHeight = window.innerHeight * 0.86;
      const boardPadding = Math.round(Math.min(26, Math.max(12, window.innerWidth * 0.015)));
      const scale = Math.min(
        (maxWidth - boardPadding * 2) / width,
        (maxHeight - boardPadding * 2) / height,
        6,
        ...[...composite.children].map((layerImage, index) => {
          if (!layerImage.naturalWidth) return Infinity;
          const layer = activeLayers[index];
          return Math.min(layerImage.naturalWidth / layer.w, layerImage.naturalHeight / layer.h);
        }),
      );

      media.classList.add("has-transparency");
      media.style.width = px(Math.round(width * scale + boardPadding * 2));
      media.style.height = px(Math.round(height * scale + boardPadding * 2));
      composite.style.left = px(boardPadding);
      composite.style.top = px(boardPadding);
      composite.style.width = px(Math.round(width * scale));
      composite.style.height = px(Math.round(height * scale));

      [...composite.children].forEach((layerImage, index) => {
        const layer = activeLayers[index];
        layerImage.style.left = px(Math.round((layer.x - left) * scale));
        layerImage.style.top = px(Math.round((layer.y - top) * scale));
        layerImage.style.width = px(Math.round(layer.w * scale));
        layerImage.style.height = px(Math.round(layer.h * scale));
      });
      return;
    }

    if (!image.naturalWidth || !image.naturalHeight) return;

    const bounds = imageMetrics || {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      transparent: false,
    };
    const maxWidth = Math.min(window.innerWidth * 0.92, 1200);
    const maxHeight = window.innerHeight * 0.86;
    const boardPadding = bounds.transparent
      ? Math.round(Math.min(26, Math.max(12, window.innerWidth * 0.015)))
      : 0;
    const availableWidth = Math.max(1, maxWidth - boardPadding * 2);
    const availableHeight = Math.max(1, maxHeight - boardPadding * 2);
    const scale = Math.min(
      availableWidth / bounds.width,
      availableHeight / bounds.height,
      1,
    );

    media.classList.toggle("has-transparency", bounds.transparent);
    media.style.width = px(Math.round(bounds.width * scale + boardPadding * 2));
    media.style.height = px(Math.round(bounds.height * scale + boardPadding * 2));
    image.style.width = px(Math.round(image.naturalWidth * scale));
    image.style.height = px(Math.round(image.naturalHeight * scale));
    image.style.left = px(Math.round(boardPadding - bounds.x * scale));
    image.style.top = px(Math.round(boardPadding - bounds.y * scale));
  };

  const prepareImage = () => {
    imageMetrics = imageAnalysisCache.get(activeSource) || analyzeImage();
    imageAnalysisCache.set(activeSource, imageMetrics);
    fitImage();
  };

  const open = (trigger) => {
    window.clearTimeout(hideTimer);
    trigger.classList.remove("preview-return-focus", "preview-return-hover");
    activeTrigger = trigger;
    activeLayers = trigger.dataset.previewLayers
      ? JSON.parse(trigger.dataset.previewLayers)
      : null;
    activeSource = activeLayers ? "" : trigger.dataset.previewSrc;
    imageMetrics = activeSource ? imageAnalysisCache.get(activeSource) || null : null;
    media.classList.remove("has-transparency");
    media.style.width = "";
    media.style.height = "";
    image.style.width = "";
    image.style.height = "";
    image.style.left = "";
    image.style.top = "";
    composite.replaceChildren();

    if (activeLayers) {
      image.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      composite.hidden = false;
      composite.setAttribute("aria-label", trigger.dataset.previewAlt || "Portfolio artwork");
      activeLayers.forEach((layer) => {
        const layerImage = document.createElement("img");
        layerImage.alt = "";
        layerImage.decoding = "async";
        layerImage.draggable = false;
        layerImage.addEventListener("load", () => {
          if (activeLayers && layerImage.parentElement === composite) fitImage();
        }, { once: true });
        layerImage.src = layer.src;
        composite.append(layerImage);
      });
      fitImage();
    } else {
      composite.hidden = true;
      composite.removeAttribute("aria-label");
      image.hidden = false;
      image.src = activeSource;
      image.alt = trigger.dataset.previewAlt || "Portfolio artwork";
    }
    lightbox.hidden = false;
    setPageInert(true);

    window.requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
      closeButton.focus({ preventScroll: true });
    });
  };

  const close = () => {
    if (lightbox.hidden) return;

    const returnFocus = activeTrigger;
    activeTrigger = null;
    activeLayers = null;
    lightbox.classList.remove("is-open");
    setPageInert(false);

    hideTimer = window.setTimeout(() => {
      if (lightbox.classList.contains("is-open")) return;
      lightbox.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      composite.replaceChildren();
    }, 180);

    if (returnFocus) {
      // Restore keyboard position without reactivating the artwork's hover/focus styling.
      returnFocus.classList.add("preview-return-focus");
      const group = returnFocus.dataset.previewGroup;
      const members = group
        ? [...stage.querySelectorAll("[data-preview-group]")].filter((member) => member.dataset.previewGroup === group)
        : [returnFocus];
      members.forEach((member) => member.classList.add("preview-return-hover"));
      returnFocus.focus({ preventScroll: true });
    }
  };

  stage.addEventListener("click", (event) => {
    const trigger = event.target.closest(".artwork-trigger");
    if (trigger) open(trigger);
  });

  stage.addEventListener("keydown", (event) => {
    const trigger = event.target.closest(".artwork-trigger");
    if (!trigger || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    open(trigger);
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  image.addEventListener("load", prepareImage);
  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) close();
  });
  window.addEventListener("resize", () => {
    if (!lightbox.hidden) fitImage();
  }, { passive: true });
};

if (!design || !stage) {
  throw new Error(`Missing portfolio design data for ${pageName}`);
}

const assetRoot = `assets/layers/${design.assetFolder}`;
const priorityImages = selectPriorityImages(design);
const fragment = document.createDocumentFragment();
design.layers.forEach((item) => {
  const priority = priorityImages.has(item) ? "high" : "low";
  fragment.append(renderLayer(item, assetRoot, priority));
});
stage.append(fragment);

createLightbox();
prepareLinkedPages();
fitStage();
window.addEventListener("resize", fitStage, { passive: true });
