const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function showEvidenceCopy() {
  document.querySelector(".evidence .panel-copy")?.classList.add("is-visible");
}

function hideEvidenceCopy() {
  document.querySelector(".evidence .panel-copy")?.classList.remove("is-visible");
}

function initFirstScreenSnap() {
  const secondPanel = document.querySelector(".evidence");
  const header = document.querySelector(".site-header");
  if (!secondPanel) return;

  let touchStartY = 0;
  let touchStartScrollY = 0;
  let locked = false;
  let hasStartedSnap = false;

  function headerHeight() {
    return header ? header.getBoundingClientRect().height : 0;
  }

  function secondTop() {
    return Math.max(0, secondPanel.offsetTop - headerHeight());
  }

  function easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function revealEvidenceCopy() {
    showEvidenceCopy();
  }

  function scrollToSecondPanel() {
    const start = window.scrollY;
    const target = secondTop();
    const distance = target - start;
    const duration = prefersReducedMotion ? 0 : 960;
    const startTime = performance.now();

    if (duration === 0 || Math.abs(distance) < 1) {
      window.scrollTo(0, target);
      revealEvidenceCopy();
      locked = false;
      hasStartedSnap = false;
      return;
    }

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextY = start + distance * easeInOutCubic(progress);
      window.scrollTo(0, nextY);

      if (progress >= 0.96) {
        revealEvidenceCopy();
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }

      window.scrollTo(0, secondTop());
      revealEvidenceCopy();
      locked = false;
      hasStartedSnap = false;
    }

    requestAnimationFrame(tick);
  }

  function isInFirstScreenZone(startY) {
    return startY < Math.min(140, secondTop() * 0.22);
  }

  function snapToSecond() {
    if (locked) return;

    locked = true;
    hasStartedSnap = true;
    hideEvidenceCopy();
    scrollToSecondPanel();
  }

  const evidenceVisibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (locked) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.72) {
          revealEvidenceCopy();
          return;
        }

        if (!entry.isIntersecting || entry.intersectionRatio < 0.18) {
          hideEvidenceCopy();
        }
      });
    },
    { threshold: [0, 0.18, 0.72] }
  );

  evidenceVisibilityObserver.observe(secondPanel);

  function maybeSnapDown(deltaY, startY, event) {
    if (locked) {
      event.preventDefault();
      return;
    }

    if (deltaY > 12 && isInFirstScreenZone(startY)) {
      event.preventDefault();
      snapToSecond();
    }
  }

  window.addEventListener(
    "wheel",
    (event) => {
      maybeSnapDown(event.deltaY, window.scrollY, event);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0]?.clientY || 0;
      touchStartScrollY = window.scrollY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      const currentY = event.touches[0]?.clientY || touchStartY;
      const deltaY = touchStartY - currentY;

      if (locked) {
        event.preventDefault();
        return;
      }

      if (hasStartedSnap || Math.abs(deltaY) < 10) return;
      maybeSnapDown(deltaY, touchStartScrollY, event);
    },
    { passive: false }
  );
}

initFirstScreenSnap();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.28 }
);

document.querySelectorAll(".from-left, .reveal").forEach((element) => {
  if (element.closest(".evidence")) return;
  revealObserver.observe(element);
});

function formatNumber(value, format = "comma") {
  const formatted = new Intl.NumberFormat("en-US").format(value);
  return format === "dot" ? formatted.replaceAll(",", ".") : formatted;
}

function animateCount(element) {
  if (element.dataset.done === "true") return;
  element.dataset.done = "true";

  const target = Number(element.dataset.target || 0);
  const format = element.dataset.format || "comma";
  if (prefersReducedMotion || target <= 3) {
    element.textContent = formatNumber(target, format);
    return;
  }

  const duration = target > 100000 ? 2200 : 1500;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatNumber(Math.round(target * eased), format);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.55 }
);

document.querySelectorAll(".count").forEach((element) => {
  countObserver.observe(element);
});

function initNativeVideoCarousel(onChange) {
  const carousel = document.querySelector(".youtube-swiper");
  if (!carousel) return;

  const wrapper = carousel.querySelector(".swiper-wrapper");
  const slides = [...carousel.querySelectorAll(".swiper-slide")];
  const pagination = carousel.querySelector(".swiper-pagination");
  if (!wrapper || slides.length === 0) return;

  carousel.classList.add("is-native");
  let active = 0;
  const bullets = slides.map((_, index) => {
    const bullet = document.createElement("button");
    bullet.type = "button";
    bullet.className = "swiper-pagination-bullet";
    bullet.setAttribute("aria-label", `Go to video ${index + 1}`);
    bullet.addEventListener("click", () => {
      active = index;
      render();
    });
    pagination?.appendChild(bullet);
    return bullet;
  });

  function render() {
    const activeSlide = slides[active];
    if (activeSlide && window.matchMedia("(min-width: 768px)").matches) {
      const offset = carousel.clientWidth / 2 - (activeSlide.offsetLeft + activeSlide.offsetWidth / 2);
      wrapper.style.transform = `translateX(${offset}px)`;
    } else {
      wrapper.style.transform = `translateX(${-active * carousel.clientWidth}px)`;
    }
    bullets.forEach((bullet, index) => {
      bullet.classList.toggle("swiper-pagination-bullet-active", index === active);
    });
    onChange?.(active);
  }

  render();
  window.addEventListener("resize", render);

  return {
    prev() {
      active = (active - 1 + slides.length) % slides.length;
      render();
    },
    next() {
      active = (active + 1) % slides.length;
      render();
    },
    goTo(index) {
      active = (index + slides.length) % slides.length;
      render();
    },
    getActive() {
      return active;
    }
  };
}

function initDesktopThreeSlotYoutubeCarousel() {
  const carousel = document.querySelector(".youtube-swiper");
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll(".swiper-slide")];
  if (slides.length === 0) return;

  carousel.classList.add("is-three-slot");
  let active = 0;

  function render() {
    const prevIndex = (active - 1 + slides.length) % slides.length;
    const nextIndex = (active + 1) % slides.length;

    slides.forEach((slide, index) => {
      let slot = "hidden";
      if (index === prevIndex) slot = "prev";
      if (index === active) slot = "active";
      if (index === nextIndex) slot = "next";

      slide.dataset.slot = slot;
      slide.classList.toggle("is-active", slot === "active");
      slide.classList.toggle("is-prev", slot === "prev");
      slide.classList.toggle("is-next", slot === "next");
      slide.classList.toggle("is-hidden", slot === "hidden");
    });
  }

  render();

  return {
    prev() {
      active = (active - 1 + slides.length) % slides.length;
      render();
    },
    next() {
      active = (active + 1) % slides.length;
      render();
    },
    goTo(index) {
      active = (index + slides.length) % slides.length;
      render();
    },
    getActive() {
      return active;
    }
  };
}

function initYoutubeNavControls() {
  const prev = document.querySelector(".youtube-prev");
  const next = document.querySelector(".youtube-next");

  prev?.addEventListener("click", () => {
    goToYoutubeIndex(getActiveYoutubeIndex() - 1);
  });

  next?.addEventListener("click", () => {
    goToYoutubeIndex(getActiveYoutubeIndex() + 1);
  });
}

let youtubeSwiper = null;
let nativeVideoCarousel = null;
const youtubePlayers = [];
let youtubeStartGuard = null;
let youtubePlaybackTimer = null;

function youtubeOrigin() {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }

  return "";
}

function youtubePlayerVars(index) {
  const playerVars = {
    autoplay: index === 0 ? 1 : 0,
    controls: 0,
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
    mute: 1
  };
  const origin = youtubeOrigin();

  if (origin) {
    playerVars.origin = origin;
  }

  return playerVars;
}

function playYoutubeAt(index) {
  window.clearTimeout(youtubeStartGuard);
  window.clearTimeout(youtubePlaybackTimer);
  const activeIndex = youtubePlayers.length ? (index + youtubePlayers.length) % youtubePlayers.length : 0;

  youtubePlayers.forEach((player, playerIndex) => {
    if (!player || typeof player.playVideo !== "function") return;

    if (playerIndex === activeIndex) {
      player.mute();
      player.seekTo(0, true);
      player.playVideo();
      youtubeStartGuard = window.setTimeout(() => {
        if (typeof player.getPlayerState === "function" && player.getPlayerState() !== YT.PlayerState.PLAYING) {
          player.pauseVideo();
        }
      }, 4200);
    } else {
      player.pauseVideo();
    }
  });
}

function pauseYoutubePlayers() {
  window.clearTimeout(youtubeStartGuard);
  youtubePlayers.forEach((player) => {
    if (player && typeof player.pauseVideo === "function") {
      player.pauseVideo();
    }
  });
}

function scheduleYoutubePlayback(index, delay = 0) {
  window.clearTimeout(youtubePlaybackTimer);
  youtubePlaybackTimer = window.setTimeout(() => playYoutubeAt(index), delay);
}

function goToNextYoutubeVideo() {
  if (!youtubePlayers.length) return;
  const nextIndex = (getActiveYoutubeIndex() + 1) % youtubePlayers.length;
  goToYoutubeIndex(nextIndex);
}

function goToYoutubeIndex(index) {
  const total = youtubePlayers.length || document.querySelectorAll(".youtube-player, .youtube-section iframe").length || 1;
  const nextIndex = (index + total) % total;

  if (youtubeSwiper) {
    if (youtubeSwiper.params.loop && typeof youtubeSwiper.slideToLoop === "function") {
      youtubeSwiper.slideToLoop(nextIndex);
    } else {
      youtubeSwiper.slideTo(nextIndex);
    }
  } else if (nativeVideoCarousel) {
    nativeVideoCarousel.goTo(nextIndex);
  }

  scheduleYoutubePlayback(nextIndex, youtubeSwiper ? youtubeSwiper.params.speed + 80 : 160);
}

function getActiveYoutubeIndex() {
  if (youtubeSwiper) {
    const index = typeof youtubeSwiper.realIndex === "number" ? youtubeSwiper.realIndex : youtubeSwiper.activeIndex || 0;
    return youtubePlayers.length ? index % youtubePlayers.length : index;
  }

  if (nativeVideoCarousel && typeof nativeVideoCarousel.getActive === "function") {
    return nativeVideoCarousel.getActive();
  }

  const wrapper = document.querySelector(".youtube-swiper .swiper-wrapper");
  const match = wrapper?.style.transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  const width = document.querySelector(".youtube-swiper")?.clientWidth || 1;
  return match ? Math.abs(Math.round(Number(match[1]) / width)) : 0;
}

function initYoutubePlayers() {
  document.querySelectorAll(".youtube-player").forEach((element, index) => {
    const videoId = element.dataset.videoId;
    if (!videoId) return;

    youtubePlayers[index] = new YT.Player(element.id, {
      videoId,
      host: "https://www.youtube.com",
      playerVars: youtubePlayerVars(index),
      events: {
        onReady(event) {
          event.target.mute();
          if (index === getActiveYoutubeIndex() && !prefersReducedMotion) {
            event.target.playVideo();
          }
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            window.clearTimeout(youtubeStartGuard);
          }

          if (event.data === YT.PlayerState.ENDED) {
            goToNextYoutubeVideo();
          }
        },
        onError() {
          if (index === getActiveYoutubeIndex()) {
            goToNextYoutubeVideo();
          }
        }
      }
    });
  });
}

window.onYouTubeIframeAPIReady = initYoutubePlayers;

function loadYoutubeApi() {
  if (window.YT?.Player) {
    initYoutubePlayers();
    return;
  }

  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);
}

function resolveYoutubePointerGesture(start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (Math.hypot(deltaX, deltaY) <= 14) return "tap";
  if (absX >= 44 && absX > absY * 1.2) return deltaX < 0 ? "swipe-left" : "swipe-right";
  if (absY > absX && absY >= 28) return "scroll";
  return "none";
}

function isYoutubePlayerPlaying(player) {
  if (!player || typeof player.getPlayerState !== "function" || !window.YT?.PlayerState) return false;
  return player.getPlayerState() === YT.PlayerState.PLAYING;
}

function toggleActiveYoutubeVideo() {
  const active = getActiveYoutubeIndex();
  const player = youtubePlayers[active];

  window.clearTimeout(youtubeStartGuard);

  if (isYoutubePlayerPlaying(player)) {
    player.pauseVideo();
    return;
  }

  if (player?.playVideo) {
    player.mute();
    player.playVideo();
  }
}

function initYoutubePointerControls() {
  const layer = document.querySelector(".youtube-video-click-layer");
  if (!layer) return;

  let pointerStart = null;
  let suppressNextClick = false;

  layer.addEventListener("pointerdown", (event) => {
    suppressNextClick = false;
    pointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
  });

  layer.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;

    const action = resolveYoutubePointerGesture(pointerStart, {
      x: event.clientX,
      y: event.clientY
    });
    pointerStart = null;

    if (action === "swipe-left") {
      suppressNextClick = true;
      goToYoutubeIndex(getActiveYoutubeIndex() + 1);
      return;
    }

    if (action === "swipe-right") {
      suppressNextClick = true;
      goToYoutubeIndex(getActiveYoutubeIndex() - 1);
    }
  });

  layer.addEventListener("click", (event) => {
    if (suppressNextClick) {
      event.preventDefault();
      suppressNextClick = false;
      return;
    }

    toggleActiveYoutubeVideo();
  });

  layer.addEventListener("pointercancel", () => {
    pointerStart = null;
    suppressNextClick = false;
  });
}

window.__mobileStaticTest = {
  resolveYoutubePointerGesture,
  formatNumber,
  youtubePlayerVars
};

const isDesktopYoutubeCarousel = window.matchMedia("(min-width: 768px)").matches;

if (isDesktopYoutubeCarousel) {
  nativeVideoCarousel = initDesktopThreeSlotYoutubeCarousel();
} else if (typeof Swiper !== "undefined") {
  youtubeSwiper = new Swiper(".youtube-swiper", {
    slidesPerView: 1,
    centeredSlides: false,
    spaceBetween: 0,
    loop: false,
    rewind: true,
    speed: 700,
    allowTouchMove: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true
    },
    breakpoints: {
      768: {
        slidesPerView: "auto",
        centeredSlides: true,
        spaceBetween: 26
      }
    },
    on: {
      slideChangeTransitionStart() {
        pauseYoutubePlayers();
      },
      slideChangeTransitionEnd(swiper) {
        playYoutubeAt(typeof swiper.realIndex === "number" ? swiper.realIndex : swiper.activeIndex);
      },
      slideChange(swiper) {
        if (!window.matchMedia("(min-width: 768px)").matches) {
          scheduleYoutubePlayback(typeof swiper.realIndex === "number" ? swiper.realIndex : swiper.activeIndex, 120);
        }
      }
    }
  });
} else {
  nativeVideoCarousel = initNativeVideoCarousel(playYoutubeAt);
}

loadYoutubeApi();
initYoutubePointerControls();
initYoutubeNavControls();

document.querySelectorAll(".newsletter form").forEach((form) => {
  form.addEventListener("submit", (event) => event.preventDefault());
});
