/**
 * script.js — Eeshwar Maturu Portfolio
 * Advanced: Intersection Observer, scroll-spy, custom cursor,
 * skill bar animation, stagger reveals, keyboard trap (modal),
 * view transitions, idle preload, particles, tilt effect,
 * smooth counter, connection-aware asset loading
 */

/* ─────────────────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const on = (el, ev, fn, opts) => el?.addEventListener(ev, fn, opts);
const raf = requestAnimationFrame;

/** Clamp a value between min and max */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/** Debounce — delay execution until calls stop */
function debounce(fn, ms = 100) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Throttle — execute at most once per frame */
function throttle(fn) {
  let frame;
  return (...args) => {
    cancelAnimationFrame(frame);
    frame = raf(() => fn(...args));
  };
}

/** Dispatch a custom event on an element */
const emit = (el, name, detail = {}) =>
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

/* ─────────────────────────────────────────────────────────────
   1. Theme System
   Supports: OS preference detection, manual toggle, persistence,
   smooth transitions via [data-theme], color-scheme meta sync
────────────────────────────────────────────────────────────── */
const ThemeManager = (() => {
  const STORAGE_KEY = "pf_theme";
  const root = document.documentElement;
  const metaTheme =
    $("meta[name=theme-color]") ??
    Object.assign(document.createElement("meta"), { name: "theme-color" });

  if (!$("meta[name=theme-color]")) document.head.append(metaTheme);

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme); // fallback
    metaTheme.content = theme === "light" ? "#f6f5ff" : "#0a0a0f";
    localStorage.setItem(STORAGE_KEY, theme);
    emit(document, "themechange", { theme });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = saved ?? (prefersDark.matches ? "dark" : "light");
    apply(theme);

    // Sync when OS pref changes and user has no saved choice
    on(prefersDark, "change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY))
        apply(e.matches ? "dark" : "light");
    });
  }

  function toggle() {
    const current =
      root.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(current);
    updateToggleIcon(current);
  }

  function updateToggleIcon(theme) {
    const btn = $("#theme-toggle");
    if (!btn) return;
    const icon = $("i", btn);
    if (icon) {
      icon.className = theme === "light" ? "bx bx-sun" : "bx bx-moon";
    }
    btn.setAttribute(
      "aria-label",
      `Switch to ${theme === "light" ? "dark" : "light"} mode`,
    );
  }

  return { init, toggle, updateToggleIcon, apply };
})();

/* ─────────────────────────────────────────────────────────────
   2. Header — sticky + scroll-shadow + shrink
────────────────────────────────────────────────────────────── */
function initHeader() {
  const header = $(".header");
  if (!header) return;

  const update = throttle(() => {
    const scrolled = window.scrollY > 20;
    header.classList.toggle("scrolled", scrolled);
    header.classList.toggle("sticky", scrolled);
  });

  on(window, "scroll", update, { passive: true });
  update();
}

/* ─────────────────────────────────────────────────────────────
   3. Mobile Menu — with focus trap and keyboard navigation
────────────────────────────────────────────────────────────── */
function initMobileMenu() {
  const menuBtn = $("#menu-icon");
  const navlist = $("#navlist");
  if (!menuBtn || !navlist) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    navlist.classList.add("open");
    menuBtn.classList.replace("bx-menu", "bx-x");
    menuBtn.setAttribute("aria-expanded", "true");
    navlist.setAttribute("aria-hidden", "false");
    // Focus first nav link
    $("a", navlist)?.focus();
    trapFocus(navlist);
  }

  function closeMenu() {
    isOpen = false;
    navlist.classList.remove("open");
    menuBtn.classList.replace("bx-x", "bx-menu");
    menuBtn.setAttribute("aria-expanded", "false");
    navlist.setAttribute("aria-hidden", "true");
    releaseTrap();
    menuBtn.focus();
  }

  on(menuBtn, "click", () => (isOpen ? closeMenu() : openMenu()));

  // Close on link click
  on(navlist, "click", (e) => {
    if (e.target.tagName === "A") closeMenu();
  });

  // Close on outside click
  on(document, "click", (e) => {
    if (isOpen && !navlist.contains(e.target) && e.target !== menuBtn)
      closeMenu();
  });

  // Close on Escape
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeMenu();
  });

  // Focus trap implementation
  let _trapEl = null;
  const FOCUSABLE =
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';

  function trapFocus(el) {
    _trapEl = el;
    on(el, "keydown", trapHandler);
  }
  function releaseTrap() {
    if (_trapEl) _trapEl.removeEventListener("keydown", trapHandler);
    _trapEl = null;
  }
  function trapHandler(e) {
    if (e.key !== "Tab") return;
    const focusable = $$(_trapEl ? FOCUSABLE : "", _trapEl ?? document);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   4. Active Nav Link — IntersectionObserver scroll-spy
────────────────────────────────────────────────────────────── */
function initScrollSpy() {
  const navLinks = $$("#navlist a");
  const sections = $$("main section[id]");
  if (!sections.length) return;

  const MAP = new Map(
    navLinks.map((a) => [a.getAttribute("href")?.slice(1), a]),
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute("id");
        navLinks.forEach((a) => a.classList.remove("active"));
        MAP.get(id)?.classList.add("active");
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
  );

  sections.forEach((sec) => observer.observe(sec));
}

/* ─────────────────────────────────────────────────────────────
   5. Typing Effect — with variable speed, pause & erase
────────────────────────────────────────────────────────────── */
function initTyping() {
  const el = $("#typed-text");
  if (!el) return;

  const WORDS = [
    "Front-end Developer",
    "UI / UX Enthusiast",
    "Learning Full-Stack",
    "AI & ML Explorer",
  ];
  const TYPE_SPEED = 85;
  const ERASE_SPEED = 42;
  const PAUSE_END = 1800;
  const PAUSE_START = 400;

  let wi = 0,
    ci = 0,
    deleting = false;

  // Announce changes to screen readers
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");

  function tick() {
    const word = WORDS[wi];

    if (!deleting) {
      ci++;
      el.textContent = word.slice(0, ci);
      if (ci === word.length) {
        deleting = true;
        setTimeout(tick, PAUSE_END);
        return;
      }
    } else {
      ci--;
      el.textContent = word.slice(0, ci);
      if (ci === 0) {
        deleting = false;
        wi = (wi + 1) % WORDS.length;
        setTimeout(tick, PAUSE_START);
        return;
      }
    }

    setTimeout(tick, deleting ? ERASE_SPEED : TYPE_SPEED + Math.random() * 30);
  }

  tick();
}

/* ─────────────────────────────────────────────────────────────
   6. Scroll-Reveal — IntersectionObserver + stagger
────────────────────────────────────────────────────────────── */
function initReveal() {
  const items = $$("[data-reveal]");
  if (!items.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
  );

  items.forEach((el) => io.observe(el));

  // Also mark parent sections as visible (for CSS child selectors)
  const sectionIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) =>
        e.target.classList.toggle("is-visible", e.isIntersecting),
      ),
    { threshold: 0.1 },
  );
  $$("section").forEach((s) => sectionIO.observe(s));
}

/* ─────────────────────────────────────────────────────────────
   7. Skill Bar Animation — animate widths when visible
────────────────────────────────────────────────────────────── */
function initSkillBars() {
  const rows = $$(".skill-row");
  if (!rows.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const fill = $(".bar > div", entry.target);
        if (!fill) return;
        // Get target width from inline style, then reset to 0 and animate to it
        const target = fill.style.width;
        fill.style.setProperty("--bar-width", "0%");
        fill.style.width = "0%";
        // Double rAF to ensure browser paints the 0 state first
        raf(() =>
          raf(() => {
            fill.style.width = target;
          }),
        );
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  rows.forEach((row) => {
    const fill = $(".bar > div", row);
    if (fill) {
      const target = fill.style.width;
      fill.dataset.target = target;
      fill.style.width = "0%";
    }
    io.observe(row);
  });
}

/* ─────────────────────────────────────────────────────────────
   8. Project Modal — accessible: focus trap, ESC, aria
────────────────────────────────────────────────────────────── */
function initModal() {
  const modal = $("#project-modal");
  const modalTitle = $("#modal-title");
  const modalDesc = $("#modal-desc");
  const modalLink = $("#modal-link");
  const closeBtn = $(".modal-close");
  if (!modal) return;

  let prevFocus = null;
  const FOCUSABLE = 'button, a, input, [tabindex]:not([tabindex="-1"])';

  function open(card) {
    modalTitle.textContent = card.dataset.title ?? "Project";
    modalDesc.textContent = card.dataset.desc ?? "";
    modalLink.href = card.dataset.link ?? "#";
    modal.setAttribute("aria-hidden", "false");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");
    prevFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    // Delay focus so transition completes
    setTimeout(() => closeBtn?.focus(), 80);
    on(modal, "keydown", trapModal);
  }

  function close() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modal.removeEventListener("keydown", trapModal);
    prevFocus?.focus();
  }

  function trapModal(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = $$(FOCUSABLE, modal);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  $$(".project-card").forEach((card) => {
    on($(".open-project", card), "click", () => open(card));
  });

  on(closeBtn, "click", close);
  on(modal, "click", (e) => {
    if (e.target === modal) close();
  });
}

/* ─────────────────────────────────────────────────────────────
   9. Contact Form — validation, loading state, Formspree
────────────────────────────────────────────────────────────── */
function initContactForm() {
  const form = $("#contact-form");
  const status = $("#form-status");
  if (!form || !status) return;

  // Inline validation feedback
  const validators = {
    name: (v) => v.trim().length >= 2 || "Name must be at least 2 characters.",
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address.",
    message: (v) =>
      v.trim().length >= 10 || "Message must be at least 10 characters.",
  };

  function validate(input) {
    const result = validators[input.name]?.(input.value);
    const isValid = result === true;
    const errId = `${input.name}-err`;
    let errEl = $(`#${errId}`);

    if (!errEl) {
      errEl = document.createElement("p");
      errEl.id = errId;
      errEl.style.cssText =
        "font-size:.8rem; color:var(--clr-rose); margin-top:.25rem;";
      input.insertAdjacentElement("afterend", errEl);
    }

    errEl.textContent = isValid ? "" : result;
    input.style.borderColor = isValid ? "" : "var(--clr-rose)";
    input.setAttribute("aria-invalid", String(!isValid));
    return isValid;
  }

  // Live validation on blur
  $$("[name]", form).forEach((input) => {
    on(input, "blur", () => validate(input));
    on(
      input,
      "input",
      debounce(() => validate(input), 300),
    );
  });

  function showStatus(msg, type) {
    status.textContent = msg;
    status.removeAttribute("data-ok");
    status.removeAttribute("data-err");
    if (type) status.setAttribute(`data-${type}`, "");
    status.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  on(form, "submit", async (e) => {
    e.preventDefault();

    // Validate all fields before submitting
    const inputs = $$("[name]", form);
    const allValid = inputs.map(validate).every(Boolean);
    if (!allValid) {
      inputs.find((i) => i.getAttribute("aria-invalid") === "true")?.focus();
      return;
    }

    const url = form.getAttribute("action");
    if (!url || url.includes("YOUR_FORMSPREE_ID")) {
      showStatus(
        "⚠ Replace YOUR_FORMSPREE_ID in the form action to enable submissions.",
        "err",
      );
      return;
    }

    // Loading state
    const submitBtn = $("[type=submit]", form);
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    submitBtn.setAttribute("aria-busy", "true");
    showStatus("", null);

    try {
      const resp = await fetch(url, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.ok) {
        showStatus("✓ Message sent — I'll reply soon!", "ok");
        form.reset();
        inputs.forEach((i) => (i.style.borderColor = ""));
      } else {
        const json = await resp.json().catch(() => ({}));
        showStatus(json.error ?? "Submission failed. Please try again.", "err");
      }
    } catch (err) {
      const msg =
        err.name === "TimeoutError"
          ? "Request timed out — check your connection."
          : "Network error — please try again.";
      showStatus(msg, "err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.removeAttribute("aria-busy");
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   10. Custom Cursor — magnetic on interactive elements
────────────────────────────────────────────────────────────── */
function initCursor() {
  // Only on fine-pointer (desktop mouse) devices
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cursor = Object.assign(document.createElement("div"), {
    className: "custom-cursor",
  });
  cursor.style.cssText = `
    position: fixed; pointer-events: none; z-index: 9999;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--clr-accent); mix-blend-mode: difference;
    translate: -50% -50%; top: 0; left: 0;
    transition: width 200ms, height 200ms, opacity 200ms;
    will-change: transform;
  `;
  document.body.append(cursor);

  let mx = 0,
    my = 0,
    cx = 0,
    cy = 0;

  on(document, "mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  (function loop() {
    cx += (mx - cx) * 0.14;
    cy += (my - cy) * 0.14;
    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;
    raf(loop);
  })();

  // Grow on interactive elements
  on(document, "mouseover", (e) => {
    if (e.target.matches("a, button, [role=button], input, textarea")) {
      cursor.style.width = "28px";
      cursor.style.height = "28px";
      cursor.style.opacity = ".6";
    }
  });
  on(document, "mouseout", (e) => {
    if (e.target.matches("a, button, [role=button], input, textarea")) {
      cursor.style.width = "12px";
      cursor.style.height = "12px";
      cursor.style.opacity = "1";
    }
  });
  on(document, "mousedown", () => {
    cursor.style.transform = "translate(-50%,-50%) scale(.7)";
  });
  on(document, "mouseup", () => {
    cursor.style.transform = "translate(-50%,-50%) scale(1)";
  });
}

/* ─────────────────────────────────────────────────────────────
   11. Card Tilt Effect — 3D perspective on project cards
────────────────────────────────────────────────────────────── */
function initTilt() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  $$(".project-card").forEach((card) => {
    const MAX = 10; // max tilt degrees

    on(card, "mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = clamp(-y * MAX, -MAX, MAX);
      const ry = clamp(x * MAX, -MAX, MAX);
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    });

    on(card, "mouseleave", () => {
      card.style.transition = "transform 500ms cubic-bezier(.16,1,.3,1)";
      card.style.transform = "";
      setTimeout(() => (card.style.transition = ""), 500);
    });

    on(card, "mouseenter", () => {
      card.style.transition = "transform 100ms linear";
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   12. Particle Canvas — subtle floating dots in hero
────────────────────────────────────────────────────────────── */
function initParticles() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const hero = $(".home");
  if (!hero) return;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .4;
  `;
  hero.prepend(canvas);

  const ctx = canvas.getContext("2d");
  const COLOR =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--clr-accent")
      .trim() || "#6c63ff";

  let W,
    H,
    particles = [];

  function resize() {
    W = canvas.width = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  }

  function createParticles(n = 55) {
    particles = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = COLOR;
      ctx.globalAlpha = p.a;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  let animId;
  function loop() {
    draw();
    animId = raf(loop);
  }

  // Pause when tab hidden
  on(document, "visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else loop();
  });

  resize();
  createParticles();
  loop();

  on(
    window,
    "resize",
    debounce(() => {
      resize();
      createParticles();
    }, 200),
  );
}

/* ─────────────────────────────────────────────────────────────
   13. Smooth Scroll — with offset for fixed header
────────────────────────────────────────────────────────────── */
function initSmoothScroll() {
  on(document, "click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = $(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    const headerH = $(".header")?.offsetHeight ?? 70;
    const top =
      target.getBoundingClientRect().top + window.scrollY - headerH - 16;

    // Use View Transition API if available
    if (document.startViewTransition) {
      document.startViewTransition(() =>
        window.scrollTo({ top, behavior: "smooth" }),
      );
    } else {
      window.scrollTo({ top, behavior: "smooth" });
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   14. Footer Year
────────────────────────────────────────────────────────────── */
function initYear() {
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ─────────────────────────────────────────────────────────────
   15. Idle-time Preloading — prefetch assets when browser idle
────────────────────────────────────────────────────────────── */
function initIdlePreload() {
  if (!("requestIdleCallback" in window)) return;
  const links = ["/resume.pdf"];
  requestIdleCallback(
    () => {
      links.forEach((href) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        document.head.append(link);
      });
    },
    { timeout: 4000 },
  );
}

/* ─────────────────────────────────────────────────────────────
   16. Performance Observer — log LCP in dev
────────────────────────────────────────────────────────────── */
function initPerfObserver() {
  if (
    location.hostname !== "localhost" &&
    !location.hostname.includes("127.0.0.1")
  )
    return;
  if (!("PerformanceObserver" in window)) return;

  try {
    new PerformanceObserver((list) => {
      const lcp = list.getEntries().at(-1);
      console.info(
        `[Perf] LCP: ${lcp.startTime.toFixed(0)}ms — element:`,
        lcp.element,
      );
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        if (e.value > 100)
          console.warn(`[Perf] CLS spike: ${e.value.toFixed(4)}`);
      });
    }).observe({ type: "layout-shift", buffered: true });
  } catch (_) {
    /* observer not supported */
  }
}

/* ─────────────────────────────────────────────────────────────
   17. Connection-Aware Loading — reduce animations on slow nets
────────────────────────────────────────────────────────────── */
function initConnectionAware() {
  const conn = navigator.connection;
  if (!conn) return;
  if (
    conn.saveData ||
    conn.effectiveType === "2g" ||
    conn.effectiveType === "slow-2g"
  ) {
    document.documentElement.dataset.lowBandwidth = "";
    // Disable particles and tilt on slow connections (handled in CSS too)
    console.info("[Net] Low-bandwidth mode enabled.");
  }
}

/* ─────────────────────────────────────────────────────────────
   18. Back to Top — programmatic floating button
────────────────────────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.createElement("button");
  btn.innerHTML = '<i class="bx bx-up-arrow-alt"></i>';
  btn.setAttribute("aria-label", "Scroll to top");
  btn.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem; z-index: 400;
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--clr-accent); color: #fff; font-size: 1.4rem;
    display: flex; align-items: center; justify-content: center;
    border: none; cursor: pointer;
    box-shadow: 0 4px 20px var(--clr-accent-glow);
    opacity: 0; pointer-events: none; scale: .8;
    transition: opacity 300ms, scale 300ms cubic-bezier(.34,1.56,.64,1);
  `;
  document.body.append(btn);

  const toggleVisibility = throttle(() => {
    const visible = window.scrollY > 400;
    btn.style.opacity = visible ? "1" : "0";
    btn.style.pointerEvents = visible ? "auto" : "none";
    btn.style.scale = visible ? "1" : ".8";
  });

  on(window, "scroll", toggleVisibility, { passive: true });
  on(btn, "click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ─────────────────────────────────────────────────────────────
   19. Reveal data-reveal attributes in HTML automatically
   (so you don't have to add them manually everywhere)
────────────────────────────────────────────────────────────── */
function autoTagRevealElements() {
  const selectors = [
    ".project-card",
    ".skill-row",
    ".about-card",
    ".about-skills",
    ".contact-card",
    ".contact-info",
    ".resume-card",
    ".section-title",
  ];
  selectors.forEach((sel) => {
    $$(sel).forEach((el, i) => {
      if (!el.hasAttribute("data-reveal")) {
        el.setAttribute("data-reveal", "");
        if (i < 5) el.setAttribute("data-delay", String(i + 1));
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   Boot — DOMContentLoaded
────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  ThemeManager.init();
  ThemeManager.updateToggleIcon(
    document.documentElement.getAttribute("data-theme") ?? "dark",
  );

  on($("#theme-toggle"), "click", ThemeManager.toggle.bind(ThemeManager));

  initConnectionAware();
  autoTagRevealElements();
  initHeader();
  initMobileMenu();
  initScrollSpy();
  initTyping();
  initReveal();
  initSkillBars();
  initModal();
  initContactForm();
  initSmoothScroll();
  initCursor();
  initTilt();
  initParticles();
  initBackToTop();
  initYear();
  initIdlePreload();
  initPerfObserver();
});
