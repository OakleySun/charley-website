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
  if (item.matrix) {
    element.style.transform = `matrix(${item.matrix.join(",")})`;
    element.style.transformOrigin = "0 0";
  } else if (item.rotate) element.style.transform = `rotate(${item.rotate}deg)`;
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
  element.dataset.previewBox = JSON.stringify({
    w: item.w,
    h: item.h,
    sprite: item.sprite,
    inner: item.inner,
    fit: item.fit || "cover",
    position: item.position || "center",
    opacity: item.opacity,
    border: item.border,
    background: item.background,
    shadow: item.shadow,
    rotate: item.rotate,
  });
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

const createImageFrame = (item, image) => {
  image.className = "";
  if (item.sprite) {
    const frame = document.createElement("div");
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
    return frame;
  }

  if (item.inner) {
    const frame = document.createElement("div");
    frame.className = "layer image-layer";
    image.style.width = px(item.inner.w);
    image.style.height = px(item.inner.h);
    image.style.objectFit = item.fit || "cover";
    if (item.position) image.style.objectPosition = item.position;
    image.style.transform = `translate(-50%, -50%) rotate(${item.inner.rotate || 0}deg)`;
    frame.append(image);
    return frame;
  }

  image.className = "layer";
  image.style.objectFit = item.fit || "cover";
  if (item.position) image.style.objectPosition = item.position;
  return image;
};

const createImage = (item, assetRoot, priority) => {
  const image = document.createElement("img");
  const frame = createImageFrame(item, image);
  applyBox(frame, item);
  loadDisplayImage(image, frame, item, assetRoot, priority);
  return makePreviewable(frame, item, assetRoot);
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
  if (item.matrix) {
    applyBox(image, item);
    return image;
  }
  const thickness = item.thickness || 1;
  let frame = image;
  if (item.renderScale) {
    // Rasterize hairline SVGs above one pixel, then preserve their original visual size.
    frame = document.createElement("div");
    frame.className = "layer";
    image.style.left = "0";
    image.style.top = "0";
    image.style.width = px(item.length * item.renderScale);
    image.style.height = px(thickness * item.renderScale);
    image.style.transform = `scale(${1 / item.renderScale})`;
    image.style.transformOrigin = "0 0";
    image.style.willChange = "transform";
    frame.append(image);
  }
  frame.style.left = px(item.cx);
  frame.style.top = px(item.cy);
  frame.style.width = px(item.length);
  frame.style.height = px(thickness);
  frame.style.transform = `translate(-50%, -50%) rotate(${item.angle}deg)`;
  frame.style.transformOrigin = "center";
  if (item.opacity !== undefined) frame.style.opacity = item.opacity;
  return frame;
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
  const cropFrame = document.createElement("div");
  const image = document.createElement("img");
  const composite = document.createElement("div");
  const closeButton = document.createElement("button");
  const previousButton = document.createElement("button");
  const nextButton = document.createElement("button");
  const announcement = document.createElement("div");
  const neighboringImages = new Map();
  const seenGroups = new Set();
  const gallery = [...stage.querySelectorAll(".artwork-trigger")]
    .sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft)
    .filter((trigger) => {
      const group = trigger.dataset.previewGroup;
      if (!group) return true;
      if (seenGroups.has(group)) return false;
      seenGroups.add(group);
      return true;
    });
  let activeTrigger = null;
  let activeSource = "";
  let activeLayers = null;
  let previewBox = null;
  let activeMembers = [];
  let sourceRect = null;
  let phase = "closed";
  let motion = null;
  let openingFrame = null;
  let requestId = 0;
  let galleryIndex = -1;
  let navigationDirection = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOptions = { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" };

  lightbox.className = "lightbox";
  lightbox.id = "artwork-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Enlarged portfolio image");

  media.className = "lightbox-media";
  cropFrame.className = "lightbox-crop";
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

  [previousButton, nextButton].forEach((button, index) => {
    const previous = index === 0;
    const icon = document.createElement("img");
    button.className = `lightbox-nav lightbox-${previous ? "previous" : "next"}`;
    button.type = "button";
    button.title = previous ? "Previous image" : "Next image";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-keyshortcuts", previous ? "ArrowLeft" : "ArrowRight");
    button.hidden = gallery.length < 2;
    icon.src = `assets/icons/chevron-${previous ? "left" : "right"}.svg`;
    icon.alt = "";
    icon.width = 24;
    icon.height = 24;
    icon.draggable = false;
    button.append(icon);
  });
  announcement.className = "lightbox-announcement";
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");

  cropFrame.append(image);
  media.append(cropFrame, composite);
  lightbox.append(media, previousButton, nextButton, closeButton, announcement);
  document.body.append(lightbox);

  const setPageInert = (inert) => {
    const screen = document.querySelector(".screen");
    const navigation = document.querySelector(".site-nav");
    screen?.toggleAttribute("inert", inert);
    navigation?.toggleAttribute("inert", inert);
  };

  const setPhase = (nextPhase) => {
    phase = nextPhase;
    lightbox.dataset.state = nextPhase;
    lightbox.setAttribute("aria-busy", String(nextPhase === "loading"));
  };

  const preloadNeighbors = () => {
    const sources = new Set();
    for (const offset of [-1, 0, 1]) {
      const trigger = gallery[(galleryIndex + offset + gallery.length) % gallery.length];
      if (trigger.dataset.previewLayers) {
        JSON.parse(trigger.dataset.previewLayers).forEach((layer) => sources.add(layer.src));
      } else sources.add(trigger.dataset.previewSrc);
    }
    for (const source of neighboringImages.keys()) {
      if (!sources.has(source)) neighboringImages.delete(source);
    }
    for (const source of sources) {
      if (neighboringImages.has(source)) continue;
      const preload = new Image();
      preload.decoding = "async";
      preload.fetchPriority = "low";
      preload.src = source;
      neighboringImages.set(source, preload);
    }
  };

  const previewMaxWidth = () => {
    const gutter = gallery.length > 1
      ? parseFloat(window.getComputedStyle(lightbox).getPropertyValue("--lightbox-side-gap"))
      : 0;
    return Math.max(1, Math.min(window.innerWidth * 0.92, 1200, window.innerWidth - gutter * 2));
  };

  const getSourceRect = () => {
    const rects = activeMembers.map((member) => member.getBoundingClientRect());
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return { left, top, width: right - left, height: bottom - top };
  };

  const sourceTransform = (rect) => {
    const target = (activeLayers ? composite : media).getBoundingClientRect();
    const frame = media.getBoundingClientRect();
    // Use a uniform scale so the artwork never stretches during its journey.
    const scale = Math.min(rect.width / target.width, rect.height / target.height);
    const x = rect.left + rect.width / 2 - frame.left - frame.width / 2
      - (target.left + target.width / 2 - frame.left - frame.width / 2) * scale;
    const y = rect.top + rect.height / 2 - frame.top - frame.height / 2
      - (target.top + target.height / 2 - frame.top - frame.height / 2) * scale;
    return `translate(${x}px, ${y}px) scale(${scale})`;
  };

  const cancelMotion = () => {
    motion?.cancel();
    motion = null;
    window.cancelAnimationFrame(openingFrame);
    openingFrame = null;
  };

  const revealImage = () => {
    if (phase !== "loading") return;
    fitImage();
    const from = navigationDirection
      ? `translateX(${navigationDirection * 24}px)`
      : sourceTransform(sourceRect);
    activeMembers.forEach((member) => member.classList.add("preview-in-lightbox"));
    media.style.visibility = "visible";
    setPhase("opening");
    announcement.textContent = `${galleryIndex + 1} of ${gallery.length}: ${activeTrigger.dataset.previewAlt}`;
    preloadNeighbors();

    if (reducedMotion.matches || !media.animate) {
      setPhase("open");
      return;
    }

    const animation = media.animate([
      { transform: from, opacity: navigationDirection ? 0 : 1 },
      { transform: "none", opacity: 1 },
    ], { ...motionOptions, duration: navigationDirection ? 180 : motionOptions.duration });
    motion = animation;
    animation.finished.then(() => {
      if (motion !== animation) return;
      animation.cancel();
      motion = null;
      setPhase("open");
    }, () => {});
  };

  const fitImage = () => {
    if (activeLayers) {
      const left = Math.min(...activeLayers.map((layer) => layer.x));
      const top = Math.min(...activeLayers.map((layer) => layer.y));
      const right = Math.max(...activeLayers.map((layer) => layer.x + layer.w));
      const bottom = Math.max(...activeLayers.map((layer) => layer.y + layer.h));
      const width = right - left;
      const height = bottom - top;
      const maxWidth = previewMaxWidth();
      const maxHeight = window.innerHeight * 0.86;
      const scale = Math.min(
        maxWidth / width,
        maxHeight / height,
        6,
        ...[...composite.children].map((layerImage, index) => {
          if (!layerImage.naturalWidth) return Infinity;
          const layer = activeLayers[index];
          return Math.min(layerImage.naturalWidth / layer.w, layerImage.naturalHeight / layer.h);
        }),
      );

      media.style.width = px(width * scale);
      media.style.height = px(height * scale);
      composite.style.left = "0";
      composite.style.top = "0";
      composite.style.width = px(width);
      composite.style.height = px(height);
      composite.style.transform = `scale(${scale})`;
      composite.style.transformOrigin = "0 0";

      [...composite.children].forEach((layerImage, index) => {
        const layer = activeLayers[index];
        applyBox(layerImage, { ...layer, x: layer.x - left, y: layer.y - top });
        layerImage.style.objectFit = layer.fit || "cover";
        layerImage.style.objectPosition = layer.position || "center";
      });
      return;
    }

    if (!image.naturalWidth || !image.naturalHeight) return;

    // Use the thumbnail renderer at its original dimensions, then scale the whole frame.
    if (previewBox) {
      const box = previewBox;
      const content = box.inner || box;
      const nativeScale = box.sprite
        ? image.naturalWidth / (content.w * parseFloat(box.sprite.width) / 100)
        : (box.fit === "contain" ? Math.max : Math.min)(
          image.naturalWidth / content.w,
          image.naturalHeight / content.h,
        );
      const scale = Math.min(
        previewMaxWidth() / box.w,
        window.innerHeight * 0.86 / box.h,
        nativeScale,
      );

      media.style.width = px(box.w * scale);
      media.style.height = px(box.h * scale);
      cropFrame.style.width = px(box.w);
      cropFrame.style.height = px(box.h);
      cropFrame.style.transform = `scale(${scale})`;
    }
  };

  const prepareImage = () => {
    if (phase !== "loading" || activeLayers || !image.naturalWidth) return;
    revealImage();
  };

  const open = (trigger, direction = 0) => {
    if (direction) {
      if (phase === "closed" || phase === "closing") return;
      cancelMotion();
      activeMembers.forEach((member) => {
        member.classList.remove("preview-in-lightbox");
        member.classList.add("preview-return-hover");
      });
    } else if (phase !== "closed") return;
    const id = ++requestId;
    navigationDirection = direction;
    galleryIndex = gallery.findIndex((candidate) => candidate === trigger
      || (trigger.dataset.previewGroup && candidate.dataset.previewGroup === trigger.dataset.previewGroup));
    trigger.classList.remove("preview-return-focus", "preview-return-hover");
    activeTrigger = trigger;
    const group = trigger.dataset.previewGroup;
    activeMembers = group
      ? [...stage.querySelectorAll("[data-preview-group]")].filter((member) => member.dataset.previewGroup === group)
      : [trigger];
    sourceRect = getSourceRect();
    setPhase("loading");
    media.style.visibility = "hidden";
    activeLayers = trigger.dataset.previewLayers
      ? JSON.parse(trigger.dataset.previewLayers)
      : null;
    activeSource = activeLayers ? "" : trigger.dataset.previewSrc;
    previewBox = trigger.dataset.previewBox ? JSON.parse(trigger.dataset.previewBox) : null;
    media.style.width = "";
    media.style.height = "";
    image.removeAttribute("style");
    cropFrame.replaceChildren();
    cropFrame.hidden = Boolean(activeLayers);
    composite.replaceChildren();

    if (activeLayers) {
      image.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      composite.hidden = false;
      composite.setAttribute("aria-label", trigger.dataset.previewAlt || "Portfolio artwork");
      const readyImages = activeLayers.map((layer) => {
        const layerImage = document.createElement("img");
        layerImage.alt = "";
        layerImage.decoding = "async";
        layerImage.draggable = false;
        const ready = new Promise((resolve) => {
          layerImage.addEventListener("load", resolve, { once: true });
          layerImage.addEventListener("error", resolve, { once: true });
        }).then(() => layerImage.decode?.().catch(() => {}));
        layerImage.src = layer.src;
        composite.append(layerImage);
        return ready;
      });
      Promise.all(readyImages).then(() => {
        if (id === requestId && phase === "loading") revealImage();
      });
    } else {
      composite.hidden = true;
      composite.removeAttribute("aria-label");
      image.hidden = false;
      const frame = createImageFrame(previewBox, image);
      applyBox(frame, { ...previewBox, x: 0, y: 0 });
      image.classList.add("lightbox-image");
      cropFrame.append(frame);
      image.src = activeSource;
      image.alt = trigger.dataset.previewAlt || "Portfolio artwork";
      if (image.complete && image.naturalWidth) {
        Promise.resolve(image.decode?.()).catch(() => {}).then(() => {
          if (id === requestId) prepareImage();
        });
      }
    }
    lightbox.hidden = false;
    setPageInert(true);

    openingFrame = window.requestAnimationFrame(() => {
      openingFrame = null;
      if (id !== requestId || phase === "closed" || phase === "closing") return;
      lightbox.classList.add("is-open");
      if (!direction) closeButton.focus({ preventScroll: true });
    });
  };

  const navigate = (direction) => {
    if (gallery.length < 2 || phase === "closed" || phase === "closing") return;
    const index = (galleryIndex + direction + gallery.length) % gallery.length;
    open(gallery[index], direction);
  };

  const finishClose = () => {
    const returnFocus = activeTrigger;
    activeMembers.forEach((member) => member.classList.remove("preview-in-lightbox"));
    activeMembers = [];
    activeTrigger = null;
    activeLayers = null;
    previewBox = null;
    sourceRect = null;
    lightbox.hidden = true;
    media.style.visibility = "hidden";
    image.removeAttribute("src");
    image.alt = "";
    composite.replaceChildren();
    announcement.textContent = "";
    setPhase("closed");
    setPageInert(false);

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

  const close = () => {
    if (phase === "closed" || phase === "closing") return;
    ++requestId;
    const ready = phase !== "loading";
    const from = window.getComputedStyle(media).transform;
    const fromOpacity = window.getComputedStyle(media).opacity;
    cancelMotion();
    lightbox.classList.remove("is-open");
    setPhase("closing");

    if (!ready || reducedMotion.matches || !media.animate) {
      finishClose();
      return;
    }

    const to = sourceTransform(getSourceRect());
    const animation = media.animate([
      { transform: from, opacity: fromOpacity },
      { transform: to, opacity: 1 },
    ], motionOptions);
    motion = animation;
    animation.finished.then(() => {
      if (motion !== animation) return;
      finishClose();
      animation.cancel();
      motion = null;
    }, () => {});
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
  image.addEventListener("load", async () => {
    const id = requestId;
    try {
      await image.decode?.();
    } catch {
      // A successfully loaded image can still be displayed if decoding is unavailable.
    }
    if (id === requestId) prepareImage();
  });
  image.addEventListener("error", () => {
    if (phase === "loading") close();
  });
  closeButton.addEventListener("click", close);
  previousButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Tab") {
      const controls = [previousButton, nextButton, closeButton].filter((button) => !button.hidden);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  });
  window.addEventListener("resize", () => {
    if (phase === "closed" || phase === "loading") return;
    const closing = phase === "closing";
    cancelMotion();
    if (closing) finishClose();
    else {
      fitImage();
      setPhase("open");
    }
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
