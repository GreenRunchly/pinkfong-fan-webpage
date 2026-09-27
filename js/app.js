(() => {
  "use strict";

  const texts = window.PINKFONG_CONTENT;
  const poses = window.PINKFONG_POSES;
  const $ = (id) => document.getElementById(id);

  let current = 0;
  let lang = "en";
  let preference = "auto";
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

  function detectLanguage() {
    const locales = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || "en"];

    for (const locale of locales) {
      const base = locale.toLowerCase().split(/[-_]/)[0];

      if (texts[base]) {
        return base;
      }
    }

    return "en";
  }

  function readPreference() {
    try {
      const saved = localStorage.getItem("pinkfong-language");

      if (saved === "auto" || texts[saved]) {
        preference = saved;
      }
    } catch {
      // The page still works if localStorage is unavailable.
    }
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
    lang = preference === "auto" ? detectLanguage() : preference;

    const content = texts[lang];

    document.documentElement.lang = lang;
    $("language").value = lang;
    $("language").setAttribute("aria-label", content.language);

    $("eyebrow").textContent = content.eyebrow;
    $("headline").innerHTML = content.headline;
    $("intro-text").innerHTML = content.intro;


    if (lang === "ko") {
      brandLink.textContent = "핑크퐁";
      brandLink.setAttribute("aria-label", "핑크퐁 팬 페이지");
    } else {
      brandLink.innerHTML = 'pink<span>fong</span>';
      brandLink.setAttribute("aria-label", "Pinkfong fan page");
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
    preference = event.target.value;

    try {
      localStorage.setItem("pinkfong-language", preference);
    } catch {
      // Ignore storage errors.
    }

    translate();
  });

  window.addEventListener("languagechange", () => {
    if (preference === "auto") {
      translate();
    }
  });

  // Pinkfong is intentionally the only story navigation control.
  $("fox").addEventListener("click", () => {
    page(current + 1);
    showHelloPopup();
  });

  readPreference();
  preloadPoses();
  createStars();
  translate();
  window.__pinkfongAssetReady?.("app");
})();
