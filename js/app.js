(() => {
  "use strict";

  const texts = window.PINKFONG_CONTENT;
  const poses = window.PINKFONG_POSES;
  const $ = (id) => document.getElementById(id);

  let current = 0;
  let lang = window.PINKFONG_PAGE_LANG || "en";
  let poseTimer;
  let poseEnterTimer;
  let poseTransitioning = false;
  let popupTimer;
  let popupHideTimer;
  let autoSwipeTimer;
  const AUTO_SWIPE_DELAY = 5000;

  const foxButton = $("fox");
  const characterImage = document.querySelector("#fox img");
  const poseFrame = document.createElement("span");
  poseFrame.className = "pose-frame";
  characterImage.parentNode.insertBefore(poseFrame, characterImage);
  poseFrame.appendChild(characterImage);

  const helloPopup = $("hello");
  const storyPanel = $("story-panel");

  // Hover-only card navigation. Swipe remains the primary touch interaction.
  const storyArrows = document.createElement("div");
  storyArrows.className = "story-arrows";
  storyArrows.setAttribute("aria-label", "Story navigation");
  storyArrows.innerHTML = `
    <button class="story-arrow story-arrow-prev" type="button" aria-label="Previous story"><span class="story-chevron" aria-hidden="true"></span></button>
    <button class="story-arrow story-arrow-next" type="button" aria-label="Next story"><span class="story-chevron" aria-hidden="true"></span></button>
  `;
  storyPanel.appendChild(storyArrows);
  const previousStoryButton = storyArrows.querySelector(".story-arrow-prev");
  const nextStoryButton = storyArrows.querySelector(".story-arrow-next");

  const sourceLink = document.querySelector(".source");
  const brandLink = document.querySelector(".brand");
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');


  function parseRgb(color) {
    const match = String(color).match(/rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i);
    return match ? match.slice(1, 4).map(Number) : null;
  }

  function relativeLuminance(rgb) {
    if (!rgb) return 0;
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  }

  function syncBrandToRenderedTheme() {
    const accent = document.querySelector("#headline .headline-emphasis em") || document.querySelector("#headline em");
    if (!accent) return;

    const color = getComputedStyle(accent).color;
    const luminance = relativeLuminance(parseRgb(color));
    const useBrightWordmark = luminance > 0.18;

    document.querySelectorAll(".brand-theme-sync").forEach((image) => {
      const nextSrc = useBrightWordmark ? image.dataset.brightSrc : image.dataset.darkSrc;
      if (nextSrc && image.getAttribute("src") !== nextSrc) {
        image.src = nextSrc;
      }
    });
  }

  function languageUrl(code) {
    const root = window.PINKFONG_PAGE_ROOT || new URL("./", window.location.href);
    const productionPath = code === "id" ? "" : `${code}/`;
    const localPath = code === "id" ? "index.html" : `${code}/index.html`;
    return new URL(window.location.protocol === "file:" ? localPath : productionPath, root).href;
  }

  function preloadPoses() {
    poses.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  function clearPoseClasses() {
    poseFrame.classList.remove(
      "pose-no-transition",
      "pose-exit-next",
      "pose-exit-prev",
      "pose-enter-next",
      "pose-enter-prev"
    );
  }

  function updatePose(direction = 1, onComplete) {
    const story = texts[lang].stories[current];
    const nextSrc = poses[current];
    const finishTransition = () => {
      poseTransitioning = false;
      clearPoseClasses();
      if (typeof onComplete === "function") {
        onComplete();
      }
    };

    characterImage.alt = story.alt;
    clearTimeout(poseTimer);
    clearTimeout(poseEnterTimer);

    if (characterImage.src === nextSrc) {
      finishTransition();
      return;
    }

    const reducedMotion = matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      characterImage.src = nextSrc;
      finishTransition();
      return;
    }

    poseTransitioning = true;
    clearPoseClasses();

    const exitClass = direction < 0 ? "pose-exit-prev" : "pose-exit-next";
    const enterClass = direction < 0 ? "pose-enter-prev" : "pose-enter-next";

    // Old pose slides away while fading out.
    void poseFrame.offsetWidth;
    poseFrame.classList.add(exitClass);

    poseTimer = setTimeout(() => {
      // Put the incoming pose on the opposite side without animating that jump.
      characterImage.src = nextSrc;
      poseFrame.classList.add("pose-no-transition");
      poseFrame.classList.remove(exitClass);
      poseFrame.classList.add(enterClass);
      void poseFrame.offsetWidth;

      // Then let it slide into place while fading in.
      poseFrame.classList.remove("pose-no-transition");
      requestAnimationFrame(() => {
        poseFrame.classList.remove(enterClass);
        poseEnterTimer = setTimeout(finishTransition, 300);
      });
    }, 220);
  }

  function hideHelloPopup(instant = false) {
    clearTimeout(popupTimer);
    clearTimeout(popupHideTimer);

    if (instant) {
      helloPopup.classList.remove("is-visible", "is-hiding");
      helloPopup.setAttribute("aria-hidden", "true");
      return;
    }

    if (!helloPopup.classList.contains("is-visible")) {
      helloPopup.classList.remove("is-hiding");
      helloPopup.setAttribute("aria-hidden", "true");
      return;
    }

    helloPopup.classList.remove("is-visible");
    helloPopup.classList.add("is-hiding");
    helloPopup.setAttribute("aria-hidden", "true");

    popupHideTimer = setTimeout(() => {
      helloPopup.classList.remove("is-hiding");
    }, 230);
  }

  function showHelloPopup() {
    clearTimeout(popupTimer);
    clearTimeout(popupHideTimer);

    helloPopup.classList.remove("is-visible", "is-hiding");

    // Force a style flush so repeated clicks always replay the pop animation.
    void helloPopup.offsetWidth;

    helloPopup.classList.add("is-visible");
    helloPopup.setAttribute("aria-hidden", "false");

    popupTimer = setTimeout(() => {
      hideHelloPopup(false);
    }, 3000);
  }

  function page(index, direction = 1, options = {}) {
    const next = (index + poses.length) % poses.length;
    const { popupAfterTransition = false } = options;

    if (poseTransitioning && next !== current) {
      return false;
    }

    current = next;
    const story = texts[lang].stories[current];

    hideHelloPopup(true);

    $("category").textContent = story.category;
    $("title").textContent = story.title;
    $("description").textContent = story.description;
    $("hello").textContent = story.hello;
    helloPopup.dataset.story = String(current + 1);
    $("number").textContent = `0${current + 1} / 03`;

    document.querySelectorAll(".dots i").forEach((dot, index) => {
      dot.classList.toggle("active", index === current);
    });

    updatePose(direction, () => {
      if (popupAfterTransition) {
        showHelloPopup();
      }
    });
    return true;
  }

  function scheduleAutoSwipe() {
    clearTimeout(autoSwipeTimer);
    autoSwipeTimer = setTimeout(() => {
      const changed = page(current + 1, 1, { popupAfterTransition: true });
      // If a manual transition is still finishing, simply try again after the
      // normal interval instead of stacking transitions.
      scheduleAutoSwipe();
      return changed;
    }, AUTO_SWIPE_DELAY);
  }

  function resetAutoSwipe() {
    scheduleAutoSwipe();
  }

  function updateSeo(content) {
    document.title = content.metaTitle;
    metaDescription.content = content.metaDescription;

    if (ogTitle) {
      ogTitle.content = content.metaTitle;
    }

    if (ogDescription) {
      ogDescription.content = content.metaDescription;
    }
  }

  function translate() {
    lang = window.PINKFONG_PAGE_LANG || lang || "en";

    const content = texts[lang];

    document.documentElement.lang = lang;
    $("language").value = lang;
    $("language").setAttribute("aria-label", content.language);
    previousStoryButton.setAttribute("aria-label", content.previous);
    nextStoryButton.setAttribute("aria-label", content.next);

    $("eyebrow").textContent = content.eyebrow;
    $("headline").innerHTML = content.headline;
    $("intro-text").innerHTML = content.intro;

    requestAnimationFrame(syncBrandToRenderedTheme);


    if (lang === "ko") {
      brandLink.setAttribute("aria-label", lang === "ko" ? "핑크퐁 팬 페이지" : "Pinkfong fan page");
    }

    $("fox").setAttribute(
      "aria-label",
      `${content.next} — Pinkfong`
    );

    sourceLink.textContent = content.official;

    updateSeo(content);
    page(current);
  }

  function createStars() {
    for (let i = 0; i < 27; i += 1) {
      const star = document.createElement("span");

      star.className = "twinkle";
      star.textContent = i % 3 ? "✧" : "·";
      star.style.cssText = [
        `left:${(i * 37.71) % 100}%`,
        `top:${(i * 19.13) % 100}%`,
        `animation-delay:${i * 0.17}s`,
        `font-size:${12 + (i % 4) * 7}px`
      ].join(";");

      $("sky").append(star);
    }
  }

  $("language").addEventListener("change", (event) => {
    const nextLanguage = event.target.value;
    if (!texts[nextLanguage] || nextLanguage === lang) return;

    try {
      localStorage.setItem("pinkfong-language-choice", nextLanguage);
    } catch {
      // Navigation still works when storage is blocked.
    }

    window.location.href = languageUrl(nextLanguage);
  });

  previousStoryButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (page(current - 1, -1, { popupAfterTransition: true })) {
      resetAutoSwipe();
    }
  });

  nextStoryButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (page(current + 1, 1, { popupAfterTransition: true })) {
      resetAutoSwipe();
    }
  });

  // Pinkfong remains clickable, and now also supports horizontal swipe/drag.
  // Swipe left = next story, swipe right = previous story.
  // A timestamp guard prevents the synthetic click generated after a swipe from
  // reopening the speech popup.
  let gestureStart = null;
  let suppressClickUntil = 0;

  foxButton.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    gestureStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
    try {
      foxButton.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; swipe still works without it.
    }
  });

  foxButton.addEventListener("pointerup", (event) => {
    if (!gestureStart || gestureStart.id !== event.pointerId) return;

    const dx = event.clientX - gestureStart.x;
    const dy = event.clientY - gestureStart.y;
    const elapsed = performance.now() - gestureStart.time;
    const horizontalSwipe =
      Math.abs(dx) >= 42 &&
      Math.abs(dx) > Math.abs(dy) * 1.15 &&
      elapsed <= 900;

    if (horizontalSwipe) {
      // Some touch browsers dispatch a delayed click after pointerup. Keep the
      // guard alive long enough for that synthetic click to be ignored.
      suppressClickUntil = performance.now() + 750;
      event.preventDefault();
      const direction = dx < 0 ? 1 : -1;
      if (page(current + direction, direction, { popupAfterTransition: true })) {
        resetAutoSwipe();
      }
    }

    gestureStart = null;
  });

  foxButton.addEventListener("pointercancel", () => {
    gestureStart = null;
  });

  foxButton.addEventListener("click", (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      return;
    }

    if (page(current + 1, 1, { popupAfterTransition: true })) {
      resetAutoSwipe();
    }
  });

  preloadPoses();
  createStars();
  translate();
  scheduleAutoSwipe();
  window.__pinkfongAssetReady?.("app");
})();
