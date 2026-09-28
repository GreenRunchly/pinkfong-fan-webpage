(() => {
  "use strict";

  const texts = window.PINKFONG_CONTENT;
  const poses = window.PINKFONG_POSES;
  const $ = (id) => document.getElementById(id);

  let current = 0;
  let lang = window.PINKFONG_PAGE_LANG || "en";
  let poseTimer;
  let popupTimer;
  let popupHideTimer;

  const characterImage = document.querySelector("#fox img");
  const helloPopup = $("hello");
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

  function updatePose() {
    const story = texts[lang].stories[current];

    characterImage.alt = story.alt;
    clearTimeout(poseTimer);

    if (characterImage.getAttribute("src") === poses[current]) {
      characterImage.classList.remove("changing");
      return;
    }

    const reducedMotion = matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      characterImage.src = poses[current];
      characterImage.classList.remove("changing");
      return;
    }

    characterImage.classList.add("changing");

    poseTimer = setTimeout(() => {
      characterImage.src = poses[current];
      characterImage.classList.remove("changing");
    }, 150);
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
    }, 1500);
  }

  function page(index) {
    current = (index + poses.length) % poses.length;

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

    updatePose();
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

  // Pinkfong is intentionally the only story navigation control.
  $("fox").addEventListener("click", () => {
    page(current + 1);
    showHelloPopup();
  });

  preloadPoses();
  createStars();
  translate();
  window.__pinkfongAssetReady?.("app");
})();
