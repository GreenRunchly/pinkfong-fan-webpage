(() => {
    "use strict";

    /* ------------------------------------------------------------------------ */
    /* Configuration                                                            */
    /* ------------------------------------------------------------------------ */

    const CONFIG = {
        autoSwitchMs: 5000,
        popupVisibleMs: 3000,
        popupExitMs: 230,
        poseExitMs: 220,
        poseEnterMs: 300,
        swipeDistancePx: 42,
        swipeDirectionRatio: 1.15,
        swipeMaxMs: 900,
        syntheticClickGuardMs: 750,
        starCount: 34
    };

    const CHARACTERS = {
        pinkfong: {
            name: "Pinkfong",
            content: window.PINKFONG_CONTENT,
            poses: window.PINKFONG_CHARACTER_POSES.pinkfong
        },
        hogi: {
            name: "Hogi",
            content: window.HOGI_CONTENT,
            poses: window.PINKFONG_CHARACTER_POSES.hogi
        },
        jeni: {
            name: "Jeni",
            content: window.JENI_CONTENT,
            poses: window.PINKFONG_CHARACTER_POSES.jeni
        }
    };

    const byId = (id) => document.getElementById(id);

    /* ------------------------------------------------------------------------ */
    /* DOM references                                                           */
    /* ------------------------------------------------------------------------ */

    const dom = {
        fox: byId("fox"),
        foxImage: document.querySelector("#fox img"),
        popup: byId("hello"),
        panel: byId("story-panel"),
        category: byId("category"),
        title: byId("title"),
        description: byId("description"),
        number: byId("number"),
        language: byId("language"),
        eyebrow: byId("eyebrow"),
        headline: byId("headline"),
        intro: byId("intro-text"),
        sky: byId("sky"),
        source: document.querySelector(".source"),
        brand: document.querySelector(".brand"),
        metaDescription: document.querySelector('meta[name="description"]'),
        ogTitle: document.querySelector('meta[property="og:title"]'),
        ogDescription: document.querySelector('meta[property="og:description"]'),
        characterSwitcherLabel: byId("character-switcher-label"),
    };

    /* ------------------------------------------------------------------------ */
    /* State                                                                    */
    /* ------------------------------------------------------------------------ */

    const state = {
        index: 0,
        character: "pinkfong",
        language: window.PINKFONG_PAGE_LANG || "en",
        poseTransitioning: false,
        gesture: null,
        suppressClickUntil: 0,
        timers: {
            poseExit: null,
            poseEnter: null,
            popup: null,
            popupExit: null,
            autoSwitch: null
        }
    };

    /* ------------------------------------------------------------------------ */
    /* Dynamic UI setup                                                         */
    /* ------------------------------------------------------------------------ */

    const poseFrame = document.createElement("span");
    poseFrame.className = "pose-frame";
    dom.foxImage.parentNode.insertBefore(poseFrame, dom.foxImage);
    poseFrame.appendChild(dom.foxImage);

    const storyNavigation = document.createElement("div");
    storyNavigation.className = "story-arrows";
    storyNavigation.setAttribute("aria-label", "Story navigation");
    storyNavigation.innerHTML = `
        <button class="story-arrow story-arrow-prev" type="button" aria-label="Previous story">
            <span class="story-chevron" aria-hidden="true"></span>
        </button>
        <button class="story-arrow story-arrow-next" type="button" aria-label="Next story">
            <span class="story-chevron" aria-hidden="true"></span>
        </button>
    `;
    dom.panel.appendChild(storyNavigation);

    const previousButton = storyNavigation.querySelector(".story-arrow-prev");
    const nextButton = storyNavigation.querySelector(".story-arrow-next");

    /* ------------------------------------------------------------------------ */
    /* Small helpers                                                            */
    /* ------------------------------------------------------------------------ */

    function clearTimer(name) {
        window.clearTimeout(state.timers[name]);
        state.timers[name] = null;
    }

    function getCharacter() {
        return CHARACTERS[state.character] || CHARACTERS.pinkfong;
    }

    function getContent() {
        const character = getCharacter();
        return character.content[state.language] || character.content.id || character.content.en;
    }

    function getPoses() {
        return getCharacter().poses;
    }

    function wrapIndex(index) {
        const poses = getPoses();
        return (index + poses.length) % poses.length;
    }

    function formatStoryNumber(index) {
        const current = String(index + 1).padStart(2, "0");
        const total = String(getPoses().length).padStart(2, "0");
        return `${current} / ${total}`;
    }

    function syncCharacterSwitcher() {
        document.querySelectorAll(".character-option").forEach((button) => {
            const isActive = button.dataset.character === state.character;
            button.classList.toggle("is-active", isActive);

            if (isActive) {
                button.setAttribute("aria-current", "true");
            } else {
                button.removeAttribute("aria-current");
            }
        });

        document.body.dataset.character = state.character;
    }

    function parseRgb(color) {
        const match = String(color).match(
            /rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i
        );
        return match ? match.slice(1, 4).map(Number) : null;
    }

    function relativeLuminance(rgb) {
        if (!rgb) return 0;

        const channel = (value) => {
            const normalized = value / 255;
            return normalized <= 0.04045
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        };

        return (
            0.2126 * channel(rgb[0]) +
            0.7152 * channel(rgb[1]) +
            0.0722 * channel(rgb[2])
        );
    }

    /* ------------------------------------------------------------------------ */
    /* Branding / locale                                                        */
    /* ------------------------------------------------------------------------ */

    function syncWordmarkToHeadline() {
        const accent = document.querySelector("#headline .headline-emphasis em");
        if (!accent) return;

        const luminance = relativeLuminance(parseRgb(getComputedStyle(accent).color));
        const useBrightWordmark = luminance > 0.18;

        document.querySelectorAll(".brand-theme-sync").forEach((image) => {
            const nextSrc = useBrightWordmark
                ? image.dataset.brightSrc
                : image.dataset.darkSrc;

            if (nextSrc && image.getAttribute("src") !== nextSrc) {
                image.src = nextSrc;
            }
        });
    }

    function updateSeo(content) {
        document.title = content.metaTitle;
        dom.metaDescription.content = content.metaDescription;
        if (dom.ogTitle) dom.ogTitle.content = content.metaTitle;
        if (dom.ogDescription) dom.ogDescription.content = content.metaDescription;
    }

    function applyLanguage(options = {}) {
        const {
            animatePose = false,
            popupAfterTransition = false
        } = options;
        state.language = window.PINKFONG_PAGE_LANG || state.language || "en";
        const content = getContent();

        document.documentElement.lang = state.language;
        dom.language.value = state.language;
        dom.language.setAttribute("aria-label", content.language);
        previousButton.setAttribute("aria-label", content.previous);
        nextButton.setAttribute("aria-label", content.next);

        dom.eyebrow.textContent = content.eyebrow;
        dom.headline.innerHTML = content.headline;
        dom.intro.innerHTML = content.intro;
        dom.source.textContent = content.official;
        dom.fox.setAttribute("aria-label", `${content.next} — ${getCharacter().name}`);

        if (dom.characterSwitcherLabel) {
            dom.characterSwitcherLabel.textContent = content.characterLabel || "Characters";
        }

        document.querySelectorAll(".character-option.is-upcoming").forEach((button) => {
            const name = button.querySelector(".character-name")?.textContent?.trim() || "Character";
            const label = `${name} — ${content.comingSoon || "Coming soon"}`;
            button.setAttribute("aria-label", label);
            button.title = label;
        });

        dom.brand.setAttribute(
            "aria-label",
            state.language === "ko" ? "핑크퐁 팬 페이지" : "Pinkfong fan page"
        );

        updateSeo(content);
        syncCharacterSwitcher();
        renderStory(state.index, 1, {
            animatePose,
            popupAfterTransition
        });
        requestAnimationFrame(syncWordmarkToHeadline);
    }

    /* ------------------------------------------------------------------------ */
    /* Pose transition                                                          */
    /* ------------------------------------------------------------------------ */

    function clearPoseClasses() {
        poseFrame.classList.remove(
            "pose-no-transition",
            "pose-exit-next",
            "pose-exit-prev",
            "pose-enter-next",
            "pose-enter-prev"
        );
    }

    function finishPoseTransition(onComplete) {
        state.poseTransitioning = false;
        clearPoseClasses();
        if (typeof onComplete === "function") onComplete();
    }

    function transitionPose(direction, onComplete) {
        const content = getContent();
        const story = content.stories[state.index];
        const nextSrc = getPoses()[state.index];

        dom.foxImage.alt = story.alt;
        clearTimer("poseExit");
        clearTimer("poseEnter");

        if (dom.foxImage.src === nextSrc) {
            finishPoseTransition(onComplete);
            return;
        }

        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            dom.foxImage.src = nextSrc;
            finishPoseTransition(onComplete);
            return;
        }

        state.poseTransitioning = true;
        clearPoseClasses();

        const exitClass = direction < 0 ? "pose-exit-prev" : "pose-exit-next";
        const enterClass = direction < 0 ? "pose-enter-prev" : "pose-enter-next";

        // Animate the current pose out.
        void poseFrame.offsetWidth;
        poseFrame.classList.add(exitClass);

        state.timers.poseExit = window.setTimeout(() => {
            // Swap the asset offscreen, then animate it back in from the other side.
            dom.foxImage.src = nextSrc;
            poseFrame.classList.add("pose-no-transition");
            poseFrame.classList.remove(exitClass);
            poseFrame.classList.add(enterClass);
            void poseFrame.offsetWidth;

            poseFrame.classList.remove("pose-no-transition");
            requestAnimationFrame(() => {
                poseFrame.classList.remove(enterClass);
                state.timers.poseEnter = window.setTimeout(
                    () => finishPoseTransition(onComplete),
                    CONFIG.poseEnterMs
                );
            });
        }, CONFIG.poseExitMs);
    }

    /* ------------------------------------------------------------------------ */
    /* Speech popup                                                             */
    /* ------------------------------------------------------------------------ */

    function hidePopup(instant = false) {
        clearTimer("popup");
        clearTimer("popupExit");

        if (instant) {
            dom.popup.classList.remove("is-visible", "is-hiding");
            dom.popup.setAttribute("aria-hidden", "true");
            return;
        }

        if (!dom.popup.classList.contains("is-visible")) {
            dom.popup.classList.remove("is-hiding");
            dom.popup.setAttribute("aria-hidden", "true");
            return;
        }

        dom.popup.classList.remove("is-visible");
        dom.popup.classList.add("is-hiding");
        dom.popup.setAttribute("aria-hidden", "true");

        state.timers.popupExit = window.setTimeout(() => {
            dom.popup.classList.remove("is-hiding");
        }, CONFIG.popupExitMs);
    }

    function showPopup() {
        clearTimer("popup");
        clearTimer("popupExit");

        dom.popup.classList.remove("is-visible", "is-hiding");
        void dom.popup.offsetWidth; // Replay the animation on repeated interactions.
        dom.popup.classList.add("is-visible");
        dom.popup.setAttribute("aria-hidden", "false");

        state.timers.popup = window.setTimeout(
            () => hidePopup(false),
            CONFIG.popupVisibleMs
        );
    }

    /* ------------------------------------------------------------------------ */
    /* Story rendering / navigation                                             */
    /* ------------------------------------------------------------------------ */

    function updateStoryCopy() {
        const story = getContent().stories[state.index];

        dom.category.textContent = story.category;
        dom.title.textContent = story.title;
        dom.description.textContent = story.description;
        dom.popup.textContent = story.hello;
        dom.popup.dataset.story = String(state.index + 1);
        document.body.dataset.story = String(state.index + 1);
        dom.number.textContent = formatStoryNumber(state.index);

        document.querySelectorAll(".dots i").forEach((dot, index) => {
            dot.classList.toggle("active", index === state.index);
        });
    }

    function renderStory(index, direction = 1, options = {}) {
        const {
            popupAfterTransition = false,
            animatePose = true
        } = options;

        const nextIndex = wrapIndex(index);
        if (state.poseTransitioning && nextIndex !== state.index) return false;

        state.index = nextIndex;
        hidePopup(true);
        updateStoryCopy();

        const afterPose = () => {
            if (popupAfterTransition) showPopup();
        };

        if (animatePose) {
            transitionPose(direction, afterPose);
        } else {
            dom.foxImage.src = getPoses()[state.index];
            dom.foxImage.alt = getContent().stories[state.index].alt;
            afterPose();
        }

        return true;
    }

    function goToStory(index, direction) {
        const changed = renderStory(index, direction, { popupAfterTransition: true });
        if (changed) restartAutoSwitch();
        return changed;
    }

    function scheduleAutoSwitch() {
        clearTimer("autoSwitch");
        state.timers.autoSwitch = window.setTimeout(() => {
            renderStory(state.index + 1, 1, { popupAfterTransition: true });
            scheduleAutoSwitch();
        }, CONFIG.autoSwitchMs);
    }

    function restartAutoSwitch() {
        scheduleAutoSwitch();
    }

    /* ------------------------------------------------------------------------ */
    /* Decorative stars                                                         */
    /* ------------------------------------------------------------------------ */

    function createStars() {
        for (let index = 0; index < CONFIG.starCount; index += 1) {
            const star = document.createElement("span");
            const isAccent = index % 9 === 0;

            star.className = `twinkle${isAccent ? " is-accent" : ""}`;
            star.textContent = isAccent ? "✦" : (index % 3 ? "✧" : "·");
            star.style.cssText = [
                `left:${(index * 37.71) % 100}%`,
                `top:${(index * 19.13) % 100}%`,
                `animation-delay:${index * 0.17}s`,
                `font-size:${12 + (index % 4) * 7}px`
            ].join(";");
            dom.sky.append(star);
        }
    }

    function preloadPoses() {
        Object.values(CHARACTERS).forEach((character) => {
            character.poses.forEach((src) => {
                const image = new Image();
                image.src = src;
            });
        });
    }

    /* ------------------------------------------------------------------------ */
    /* Events                                                                   */
    /* ------------------------------------------------------------------------ */

    dom.language.addEventListener("change", (event) => {
        const nextLanguage = event.target.value;
        if (!getCharacter().content[nextLanguage] || nextLanguage === state.language) return;

        try {
            localStorage.setItem("pinkfong-language-choice", nextLanguage);
        } catch {
            // The language still changes when storage is blocked.
        }

        window.PINKFONG_PAGE_LANG = nextLanguage;
        state.language = nextLanguage;
        applyLanguage();
        restartAutoSwitch();
    });

    previousButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        goToStory(state.index - 1, -1);
    });

    nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        goToStory(state.index + 1, 1);
    });

    dom.fox.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        state.gesture = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startedAt: performance.now()
        };

        try {
            dom.fox.setPointerCapture(event.pointerId);
        } catch {
            // Pointer capture is optional.
        }
    });

    dom.fox.addEventListener("pointerup", (event) => {
        const gesture = state.gesture;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        const dx = event.clientX - gesture.x;
        const dy = event.clientY - gesture.y;
        const elapsed = performance.now() - gesture.startedAt;
        const isHorizontalSwipe =
            Math.abs(dx) >= CONFIG.swipeDistancePx &&
            Math.abs(dx) > Math.abs(dy) * CONFIG.swipeDirectionRatio &&
            elapsed <= CONFIG.swipeMaxMs;

        if (isHorizontalSwipe) {
            state.suppressClickUntil = performance.now() + CONFIG.syntheticClickGuardMs;
            event.preventDefault();
            const direction = dx < 0 ? 1 : -1;
            goToStory(state.index + direction, direction);
        }

        state.gesture = null;
    });

    dom.fox.addEventListener("pointercancel", () => {
        state.gesture = null;
    });

    dom.fox.addEventListener("click", (event) => {
        if (performance.now() < state.suppressClickUntil) {
            event.preventDefault();
            return;
        }

        goToStory(state.index + 1, 1);
    });

    if (dom.brand) {
        dom.brand.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.reload();
        });
    }

    document.querySelectorAll(".character-option:not(:disabled)").forEach((button) => {
        button.addEventListener("click", () => {
            const nextCharacter = button.dataset.character;
            if (!CHARACTERS[nextCharacter] || nextCharacter === state.character) return;
            if (state.poseTransitioning) return;

            hidePopup(true);
            clearTimer("autoSwitch");
            state.character = nextCharacter;
            state.index = 0;
            syncCharacterSwitcher();
            applyLanguage({
                animatePose: true,
                popupAfterTransition: true
            });
            restartAutoSwitch();
        });
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            clearTimer("autoSwitch");
        } else {
            restartAutoSwitch();
        }
    });

    /* ------------------------------------------------------------------------ */
    /* Start                                                                    */
    /* ------------------------------------------------------------------------ */

    preloadPoses();
    createStars();
    applyLanguage();
    scheduleAutoSwitch();
    window.__pinkfongAssetReady?.("app");
})();
