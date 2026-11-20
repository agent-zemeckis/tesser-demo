/* Mweshi — Serialized AI Cinema Application Controller
 *
 * Views & Routes:
 *   #/                 -> Framed Editorial Home Stage + Orientation Strip + Clickable CW + Unobstructed Posters + Reels + Pilots + Alt Cuts
 *   #/reels            -> Immersive Darkroom 9:16 Vertical Scene Discovery Feed (IntersectionObserver auto-loop + 1/5 counter + loop progress + Up/Down nav)
 *   #/series/:slug     -> Series Detail View (Compact Hero, Inline More/Less, 2x2 Horizontal Episodes, Two-Column Made With Dossier, Compact Metadata)
 *   #/pilots           -> Pilot Season Community Greenlight Slate
 *   #/library          -> Saved Watchlist, Continue Watching History & Local Browser Storage Info
 *   #/search           -> Instant Search across titles, crew, genres, and provenance tags
 *   #/creators         -> Founding Creator Terms & Pilot Submission (mailto:hello@mweshi.com + Copy Summary)
 *   #/studio           -> Unlisted Founder Screener Builder (TikTok / YouTube DM Preview Link Generator)
 *   ?screener=<token>  -> Hydrates an unlisted private creator screener into Series Detail & Cinema Player
 */

(function () {
  "use strict";

  const Catalog = window.TESSER_CATALOG;
  const Store = window.TesserStore;

  const root = document.getElementById("app-root");
  const topChrome = document.getElementById("top-chrome");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeToggleIcon = document.getElementById("theme-toggle-icon");
  const themeColorMeta = document.getElementById("theme-color-meta");
  const sheet = document.getElementById("apple-sheet");
  const sheetTitle = document.getElementById("sheet-title");
  const sheetBody = document.getElementById("sheet-body");
  const sheetCloseBtn = document.getElementById("sheet-close-btn");
  const toastEl = document.getElementById("app-toast");

  /* Player Elements */
  const playerModal = document.getElementById("player-modal");
  const playerStage = document.getElementById("player-stage");
  const videoEl = document.getElementById("cinema-video");
  const iframeEl = document.getElementById("cinema-iframe");
  const playerStatusEl = document.getElementById("player-status");
  const playerSpinnerEl = document.getElementById("player-spinner");
  const playerStatusMsg = document.getElementById("player-status-msg");
  const playerRetryBtn = document.getElementById("player-retry-btn");
  const playerCloseBtn = document.getElementById("player-close-btn");
  const playerSeriesLabel = document.getElementById("player-series-label");
  const playerEpLabel = document.getElementById("player-ep-label");
  const playerAspectBtn = document.getElementById("player-aspect-btn");
  const playerTestEndBtn = document.getElementById("player-test-end-btn");
  const playerFsBtn = document.getElementById("player-fs-btn");
  const playerBottomChrome = document.getElementById("player-bottom-chrome");
  const playerPlayPauseBtn = document.getElementById("player-playpause-btn");
  const playerPlayIcon = document.getElementById("player-play-icon");
  const playerBack10Btn = document.getElementById("player-back10-btn");
  const playerFwd10Btn = document.getElementById("player-fwd10-btn");
  const playerMuteBtn = document.getElementById("player-mute-btn");
  const playerMuteIcon = document.getElementById("player-mute-icon");
  const playerMuteLabel = document.getElementById("player-mute-label");
  const playerProvBtn = document.getElementById("player-provenance-btn");
  const playerElapsed = document.getElementById("player-elapsed");
  const playerScrubber = document.getElementById("player-scrubber");
  const playerRemaining = document.getElementById("player-remaining");
  const upnextEl = document.getElementById("player-upnext");
  const upnextDismissBtn = document.getElementById("upnext-dismiss-btn");
  const upnextSeriesTitle = document.getElementById("upnext-series-title");
  const upnextEpTitle = document.getElementById("upnext-ep-title");
  const upnextPlayBtn = document.getElementById("upnext-play-btn");
  const upnextBtnLabel = document.getElementById("upnext-btn-label");
  const upnextReplayBtn = document.getElementById("upnext-replay-btn");

  const isDebugMode = new URLSearchParams(window.location.search).get("debug") === "1";

  /* Ephemeral UI State */
  let heroIndex = 0;
  let heroTimer = null;
  let heroObserver = null;
  let heroVisible = true;
  let reelsObserver = null;
  let reelsMuted = true;
  let detailTab = "episodes";
  let detailLedgerMode = "actual"; // "actual" | "aispec"
  let synopsisExpanded = false;
  let searchQuery = "";
  let toastTimer = null;
  let activeScreenerSeries = null;
  let lastPitchDraft = null;

  /* Active Player Session */
  let playerSession = {
    open: false,
    series: null,
    episode: null,
    isAlternate: false,
    lastSavedAtMs: 0,
    idleTimer: null,
    endedReached: false,
    upnextDismissed: false
  };

  /* ---------- Utilities ---------- */

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  }

  function formatRemainingShort(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    if (s < 60) return `${s}s left`;
    const mins = Math.ceil(s / 60);
    return `${mins}m left`;
  }

  function formatDurationHuman(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return `${r}s`;
    return r > 0 ? `${m}m ${r < 10 ? "0" : ""}${r}s` : `${m}m`;
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2800);
  }

  function isLaunchStripDismissed() {
    try {
      return sessionStorage.getItem("mweshi.strip.dismissed") === "1";
    } catch (_) {
      return false;
    }
  }

  function dismissLaunchStrip() {
    try {
      sessionStorage.setItem("mweshi.strip.dismissed", "1");
    } catch (_) {}
    const wrap = document.getElementById("launch-strip-wrap");
    if (wrap) wrap.remove();
  }

  function extractYouTubeId(input) {
    if (!input) return null;
    const trimmed = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const m = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function encodeBase64Url(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeBase64Url(token) {
    try {
      const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64 + "===".slice((b64.length + 3) % 4);
      const bin = atob(pad);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) {
      return null;
    }
  }

  /* ---------- Theme Management (Theme B Daylight <-> Theme C Midnight Petrol) ---------- */

  function applyTheme(theme) {
    const normalized = theme === "petrol" ? "petrol" : "daylight";
    document.documentElement.setAttribute("data-theme", normalized);
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", normalized === "petrol" ? "#0B171A" : "#F4F1EA");
    }
    if (themeToggleBtn && themeToggleIcon) {
      if (normalized === "petrol") {
        themeToggleBtn.setAttribute("aria-label", "Switch to Daylight Gallery light theme");
        themeToggleBtn.setAttribute("title", "Switch to Daylight Gallery");
        themeToggleIcon.innerHTML = `<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.07" y2="4.93"/>`;
      } else {
        themeToggleBtn.setAttribute("aria-label", "Switch to Midnight Petrol dark theme");
        themeToggleBtn.setAttribute("title", "Switch to Midnight Petrol");
        themeToggleIcon.innerHTML = `<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>`;
      }
    }
  }

  /* Hydrate unlisted TikTok / YouTube Creator Screener from ?screener=... */
  function hydrateScreenerFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("screener");
    if (!token) return;
    const data = decodeBase64Url(token);
    if (!data || !data.title) return;

    const ytId = extractYouTubeId(data.video || "");
    const isDirectMp4 = !ytId && /^https?:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(data.video || "");
    const thumb = ytId
      ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`
      : (data.poster || "assets/media/tos-hero.jpg");

    const epTitles = Array.isArray(data.episodes) && data.episodes.length
      ? data.episodes
      : ["Episode 1 — Pilot Cut"];

    activeScreenerSeries = {
      id: "creator-screener",
      slug: "screener",
      visibility: "unlisted",
      isUnlistedScreener: true,
      featured: false,
      title: String(data.title).slice(0, 90),
      wordmarkStyle: "serif",
      eyebrow: "Unlisted Creator Screener · Private Preview",
      category: String(data.genre || "Serialized AI Original · Pilot Preview").slice(0, 80),
      subline: `Prepared for ${String(data.creator || "Creator").slice(0, 60)} · Not Publicly Listed`,
      year: 2026,
      totalRuntimeLabel: `${epTitles.length} Episode${epTitles.length > 1 ? "s" : ""}`,
      rating: "13+",
      quality: "HD",
      region: "Creator Preview",
      studio: String(data.creator || "Independent AI Studio").slice(0, 80),
      poster: thumb,
      heroImage: thumb,
      synopsis:
        String(
          data.synopsis ||
            `Private cinema-grade series stage prepared by Mweshi to preview how "${data.title}" plays as an episodic show with sequential chapters and full Made With provenance.`
        ).slice(0, 500),
      synopsisExtended:
        "Unlisted preview generated for creator review only. Mweshi never lists or monetizes creator work without explicit creator agreement.",
      badges: ["UNLISTED", "HD", "C2PA READY", "CREATOR OWNED"],
      youtubeId: ytId,
      streamUrl: isDirectMp4 ? data.video : "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      pilot: { enabled: false },
      episodes: epTitles.map((epTitle, idx) => ({
        id: `scr-e${idx + 1}`,
        season: 1,
        number: idx + 1,
        title: String(epTitle).slice(0, 80),
        startSec: 0,
        endSec: 185,
        durationSec: 185,
        thumb,
        youtubeId: ytId,
        streamUrl: isDirectMp4 ? data.video : "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
        synopsis:
          idx === 0
            ? `Primary pilot stream for ${data.creator || "creator"} mounted inside Mweshi's cinema player.`
            : "Reserved sequential episode slot demonstrating automatic Up-Next continuity."
      })),
      alternateEpisodes: [],
      madeWith: {
        isStandInDemo: false,
        demoNotice:
          "Unlisted Creator Screener: This page is visible only via this private URL to show how your series looks on Mweshi. Zero rights are claimed.",
        actual: [
          { label: "Creator / Showrunner", value: String(data.creator || "Creator").slice(0, 100) },
          { label: "Toolchain Declared", value: String(data.tools || "Creator's AI + Editorial Pipeline (editable upon onboarding)").slice(0, 200) },
          { label: "Rights & Terms", value: "100% Creator-Owned IP · Non-exclusive social clips · Founding terms co-written with creators" },
          { label: "Listing Status", value: "Private Unlisted Screener — Not shown in public catalogue" }
        ],
        aiSpecExample: [
          { label: "Provenance Standard", value: "Human crew + AI models + editorial hours credited cleanly on every episode" }
        ]
      },
      languages: {
        originalAudio: "Original Creator Mix",
        audio: "Stereo",
        subtitles: "Creator Captions (CC)"
      }
    };

    if (!window.location.hash || window.location.hash === "#/") {
      window.location.hash = "#/series/screener";
    }
  }

  function resolveSeries(slug) {
    if (slug === "screener" && activeScreenerSeries) return activeScreenerSeries;
    const found = Catalog.getSeriesBySlug(slug);
    if (found) return found;
    return null;
  }

  /* ---------- Icons & Reusable HTML Builders ---------- */

  const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
  const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17.5 19 6.5"/></svg>`;
  const ICON_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><polyline points="7 8 12 3 17 8"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`;
  const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  const ICON_CHEVRON_LEFT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  const ICON_CHEVRON_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
  const ICON_CHEVRON_UP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>`;
  const ICON_CHEVRON_DOWN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
  const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
  const ICON_VOL_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
  const ICON_VOL_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  const ICON_APERTURE_M = `<svg viewBox="0 0 64 64" width="46" height="46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#F5B82E"/><path d="M13 48V16h7.4L32 35.8 43.6 16H51v32h-6.8V26.4L33.9 43.8h-3.8L19.8 26.4V48H13Z" fill="#14110F"/><path d="M22.5 52 34.5 12" stroke="#E85D26" stroke-width="4.2" stroke-linecap="butt"/></svg>`;

  function renderSmartPlayPill(series) {
    const prog = Store.getProgress(series.id);
    if (prog && !prog.completed && prog.positionSec > 3) {
      const pct = Math.min(96, Math.max(8, Math.round((prog.positionSec / Math.max(1, prog.durationSec)) * 100)));
      const remLabel = formatRemainingShort(Math.max(1, prog.durationSec - prog.positionSec));
      return `
        <button class="btn-play-white tabular" type="button" data-action="play-series" data-series="${esc(series.slug)}" aria-label="Resume ${esc(series.title)} Season ${prog.seasonNumber} Episode ${prog.episodeNumber}">
          ${ICON_PLAY}
          <span>S${prog.seasonNumber}, E${prog.episodeNumber} &middot; ${esc(remLabel)}</span>
          <span class="inline-progress-track" aria-hidden="true">
            <span class="inline-progress-fill" style="width:${pct}%"></span>
          </span>
        </button>
      `;
    }
    return `
      <button class="btn-play-white" type="button" data-action="play-series" data-series="${esc(series.slug)}">
        ${ICON_PLAY}
        <span>Play S1, E1</span>
      </button>
    `;
  }

  /* Unobstructed 2:3 Poster Card — Artwork stays pure, captions sit cleanly below */
  function renderPosterCard(series) {
    return `
      <a class="poster-card" href="#/series/${esc(series.slug)}" aria-label="${esc(series.title)} — ${series.episodes.length} episodes">
        <div class="poster-art">
          <img src="${esc(series.poster)}" alt="${esc(series.title)} poster" loading="lazy">
        </div>
        <div>
          <div class="poster-caption-title">${esc(series.title)}</div>
          <div class="poster-caption-meta tabular">${series.episodes.length} Episodes &middot; ${esc(series.quality)}</div>
        </div>
      </a>
    `;
  }

  /* Fully Clickable Continue Watching Card */
  function renderContinueWatchingCard(prog) {
    const series = resolveSeries(prog.seriesId);
    if (!series) return "";
    const ep = Catalog.getEpisode(series, prog.episodeId) || series.episodes[0];
    const pct = Math.min(96, Math.max(6, Math.round((prog.positionSec / Math.max(1, prog.durationSec)) * 100)));
    const rem = formatRemainingShort(Math.max(1, prog.durationSec - prog.positionSec));
    return `
      <article class="cw-card" aria-label="Continue watching ${esc(series.title)}">
        <button class="cw-card-media" type="button" data-action="play-episode" data-series="${esc(series.slug)}" data-ep="${esc(ep.id)}" aria-label="Resume ${esc(series.title)} S${prog.seasonNumber}, E${prog.episodeNumber}">
          <img src="${esc(ep.thumb || series.heroImage)}" alt="${esc(series.title)} ${esc(ep.title)}" loading="lazy">
          <span class="cw-play-badge" aria-hidden="true">${ICON_PLAY}</span>
          <span class="cw-progress-rail" aria-hidden="true"><span style="width:${pct}%"></span></span>
        </button>
        <div class="cw-card-footer">
          <button class="cw-card-meta-btn" type="button" data-action="play-episode" data-series="${esc(series.slug)}" data-ep="${esc(ep.id)}">
            <div class="cw-card-title">${esc(series.title)}</div>
            <div class="cw-card-sub tabular">S${prog.seasonNumber}, E${prog.episodeNumber} &middot; ${esc(rem)}</div>
          </button>
          <a class="cw-more-link" href="#/series/${esc(series.slug)}" aria-label="View ${esc(series.title)} details" title="Series details">&middot;&middot;&middot;</a>
        </div>
      </article>
    `;
  }

  function renderRailWithArrows(innerHtml) {
    return `
      <div class="rail-wrap">
        <button class="rail-arrow rail-arrow--prev" type="button" data-rail-dir="-1" aria-label="Scroll left">${ICON_CHEVRON_LEFT}</button>
        <div class="rail-scroller">${innerHtml}</div>
        <button class="rail-arrow rail-arrow--next" type="button" data-rail-dir="1" aria-label="Scroll right">${ICON_CHEVRON_RIGHT}</button>
      </div>
    `;
  }

  function setupRailScrollControls() {
    document.querySelectorAll(".rail-wrap").forEach((wrap) => {
      const scroller = wrap.querySelector(".rail-scroller");
      const prevBtn = wrap.querySelector(".rail-arrow--prev");
      const nextBtn = wrap.querySelector(".rail-arrow--next");
      if (!scroller || !prevBtn || !nextBtn) return;

      const updateArrows = () => {
        const canLeft = scroller.scrollLeft > 8;
        const canRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 8;
        prevBtn.classList.toggle("is-visible", canLeft);
        nextBtn.classList.toggle("is-visible", canRight);
      };

      prevBtn.addEventListener("click", () => {
        scroller.scrollBy({ left: -Math.round(scroller.clientWidth * 0.75), behavior: "smooth" });
      });
      nextBtn.addEventListener("click", () => {
        scroller.scrollBy({ left: Math.round(scroller.clientWidth * 0.75), behavior: "smooth" });
      });

      scroller.addEventListener("scroll", updateArrows, { passive: true });
      requestAnimationFrame(updateArrows);
      setTimeout(updateArrows, 250);
    });
  }

  function renderFooter() {
    return `
      <footer class="app-footer">
        <div class="app-footer-top">
          <div>
            <strong style="color:var(--ink);">Mweshi</strong> &middot; Serialized AI Cinema &middot; <a href="mailto:hello@mweshi.com" style="color:var(--accent);font-weight:500;">hello@mweshi.com</a>
          </div>
          <div class="app-footer-links">
            <a href="#/creators">For Creators</a>
            <a href="letter/">Founder's Letter</a>
            <a href="#/pilots">Pilot Season</a>
            <button type="button" data-action="open-cloud-sheet">Saved on this browser</button>
          </div>
        </div>
        <div class="app-footer-bottom">
          <span>Demo footage courtesy of Blender Foundation Amsterdam (CC-BY, non-AI stand-in architecture demo).</span>
          <div class="app-footer-tech">
            <a href="soul.md">For Agents (soul.md)</a>
            <span>&middot;</span>
            <a href="llms.txt">llms.txt</a>
          </div>
        </div>
      </footer>
    `;
  }

  /* ---------- View 1: Editorial Home Stage (`#/`) ---------- */

  function renderHeroContentHTML(activeHero) {
    const inList = Store.isInWatchlist(activeHero.id);
    return `
      <span class="hero-eyebrow-pill">${esc(activeHero.eyebrow)}</span>
      <h1 class="hero-wordmark" data-style="${esc(activeHero.wordmarkStyle)}">
        <a href="#/series/${esc(activeHero.slug)}">${esc(activeHero.title)}</a>
      </h1>
      <p class="hero-meta-line">
        <span>${esc(activeHero.category)}</span>
        <span>&middot;</span>
        <span class="tabular">${activeHero.episodes.length} Episodes &middot; ${esc(activeHero.quality)}</span>
      </p>
      <p class="hero-subline">${esc(activeHero.subline)}</p>
      <div class="hero-cta-row">
        ${renderSmartPlayPill(activeHero)}
        <button class="btn-circle-glass" type="button" data-action="toggle-watchlist" data-series="${esc(activeHero.id)}" aria-pressed="${inList}" aria-label="${inList ? "Remove from Library" : "Add to Library"}" title="${inList ? "In Library" : "Add to Library"}">
          ${inList ? ICON_CHECK : ICON_PLUS}
        </button>
        <a class="btn-circle-glass" href="#/series/${esc(activeHero.slug)}" aria-label="Open ${esc(activeHero.title)} series page" title="Episodes &amp; Made With Provenance">
          ${ICON_INFO}
        </a>
      </div>
    `;
  }

  function updateHeroInPlace(featured) {
    const stage = document.getElementById("hero-stage");
    if (!stage || !featured.length) return;
    const activeHero = featured[heroIndex % featured.length] || featured[0];
    const img = stage.querySelector(".hero-backdrop");
    const contentEl = document.getElementById("hero-content-slot");
    const dots = stage.querySelectorAll(".hero-dot");

    if (img && img.getAttribute("src") !== activeHero.heroImage) {
      img.classList.add("is-fading");
      setTimeout(() => {
        img.src = activeHero.heroImage;
        img.alt = `${activeHero.title} key art`;
        img.classList.remove("is-fading");
      }, 170);
    }

    if (contentEl) {
      contentEl.innerHTML = renderHeroContentHTML(activeHero);
    }

    dots.forEach((dot, idx) => {
      dot.setAttribute("aria-selected", String(idx === heroIndex % featured.length));
    });
  }

  function stopHeroRotation() {
    clearInterval(heroTimer);
    heroTimer = null;
    if (heroObserver) {
      heroObserver.disconnect();
      heroObserver = null;
    }
  }

  function startHeroRotation(featured) {
    stopHeroRotation();
    if (featured.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const stage = document.getElementById("hero-stage");
    if (!stage) return;
    heroVisible = true;

    heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          heroVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.25 }
    );
    heroObserver.observe(stage);

    heroTimer = setInterval(() => {
      const currentStage = document.getElementById("hero-stage");
      if (!currentStage || !heroVisible || currentStage.matches(":hover") || playerSession.open) return;
      heroIndex = (heroIndex + 1) % featured.length;
      updateHeroInPlace(featured);
    }, 9000);
  }

  function renderHomeView() {
    const featured = Catalog.series.filter((s) => s.featured);
    const activeHero = featured[heroIndex % featured.length] || featured[0];
    const cwList = Store.getContinueWatchingList();

    const launchStrip = !isLaunchStripDismissed()
      ? `
        <div class="launch-strip-wrap" id="launch-strip-wrap">
          <div class="launch-strip" role="region" aria-label="Platform launch notice">
            <div class="launch-strip-main">
              <span class="launch-strip-bar" aria-hidden="true"></span>
              <span><strong style="color:var(--ink);">Mweshi</strong> is launching for serialized AI shows &mdash; explore the interactive demo slate below, or apply as a Founding Creator.</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
              <a class="launch-strip-cta" href="#/creators">Founding Cohort &rarr;</a>
              <button class="launch-strip-dismiss" type="button" data-action="dismiss-launch-strip" aria-label="Dismiss launch notice">${ICON_CLOSE}</button>
            </div>
          </div>
        </div>
      `
      : "";

    const cwSection = cwList.length
      ? `
        <section class="rail-section" aria-label="Continue Watching">
          <div class="rail-header">
            <h2 class="rail-title">Continue Watching <span class="rail-chevron">&rsaquo;</span></h2>
            <span class="rail-subtitle">Resume right where you left off</span>
          </div>
          ${renderRailWithArrows(cwList.map(renderContinueWatchingCard).join(""))}
        </section>
      `
      : "";

    const premiereRail = `
      <section class="rail-section" aria-label="Premiere Demo Slate">
        <div class="rail-header">
          <h2 class="rail-title">Premiere Demo Slate <span class="rail-chevron">&rsaquo;</span></h2>
          <span class="rail-subtitle">Blender Institute open films structured into serialized seasons</span>
        </div>
        ${renderRailWithArrows(Catalog.series.map(renderPosterCard).join(""))}
      </section>
    `;

    const reelsPreviewRail = `
      <section class="rail-section" aria-label="Scene Reels Discovery">
        <div class="rail-header">
          <a href="#/reels" class="rail-title">Reels &middot; Vertical Scene Hooks <span class="rail-chevron">&rsaquo;</span></a>
          <span class="rail-subtitle">30-second hooks that open straight into Episode 1</span>
        </div>
        ${renderRailWithArrows(
          Catalog.reels
            .map(
              (r) => `
            <a class="reel-preview-card" href="#/reels?reel=${esc(r.id)}">
              <img src="${esc(r.poster)}" alt="${esc(r.title)} scene hook" loading="lazy">
              <div class="reel-preview-scrim">
                <span class="reel-preview-badge">${esc(r.tag)}</span>
                <div>
                  <div class="reel-preview-title">${esc(r.title)}</div>
                  <div class="reel-preview-hook">${esc(r.hook)}</div>
                </div>
              </div>
            </a>
          `
            )
            .join("")
        )}
      </section>
    `;

    const pilotSeries = Catalog.series.filter((s) => s.pilot && s.pilot.enabled);
    const pilotRail = `
      <section class="rail-section" aria-label="Pilot Season Community Greenlight">
        <div class="rail-header">
          <a href="#/pilots" class="rail-title">Pilot Season &middot; Greenlight <span class="rail-chevron">&rsaquo;</span></a>
          <span class="rail-subtitle">Audience demand signals which pilots earn full season backing</span>
        </div>
        ${renderRailWithArrows(pilotSeries.map(renderPilotCard).join(""))}
      </section>
    `;

    const altRail = `
      <section class="rail-section" aria-label="Alternate Timelines">
        <div class="rail-header">
          <h2 class="rail-title">Alternate Timelines &amp; Cuts <span class="rail-chevron">&rsaquo;</span></h2>
          <span class="rail-subtitle">Parallel narrative cuts mounted alongside Season 1</span>
        </div>
        ${renderRailWithArrows(
          Catalog.series
            .filter((s) => s.alternateEpisodes && s.alternateEpisodes.length)
            .map((s) => {
              const alt = s.alternateEpisodes[0];
              return `
                <a class="alt-card" href="#/series/${esc(s.slug)}?tab=alt">
                  <div class="alt-card-thumb">
                    <img src="${esc(alt.thumb)}" alt="${esc(alt.title)}" loading="lazy">
                    <span class="branch-pill">${esc(alt.branchLabel || "Alternate Cut")}</span>
                  </div>
                  <div class="alt-card-footer">
                    <div style="min-width:0;">
                      <div class="alt-card-series">${esc(s.title)}</div>
                      <div class="alt-card-cut">${esc(alt.title)}</div>
                    </div>
                    <span class="alt-card-dur tabular">${formatDurationHuman(alt.durationSec)}</span>
                  </div>
                </a>
              `;
            })
            .join("")
        )}
      </section>
    `;

    root.innerHTML = `
      <div class="hero-outer">
        <section class="hero-stage" aria-label="Featured series showcase" id="hero-stage">
          <img class="hero-backdrop" src="${esc(activeHero.heroImage)}" alt="${esc(activeHero.title)} key art">
          <div class="hero-scrim"></div>
          <div class="hero-inner">
            <div class="hero-content" id="hero-content-slot">
              ${renderHeroContentHTML(activeHero)}
            </div>
            <div class="hero-dots" role="tablist" aria-label="Featured titles">
              ${featured
                .map(
                  (s, idx) => `
                <button class="hero-dot" type="button" role="tab" aria-selected="${idx === heroIndex % featured.length}" aria-label="Show ${esc(s.title)}" data-action="hero-dot" data-index="${idx}"></button>
              `
                )
                .join("")}
            </div>
          </div>
        </section>
      </div>

      ${launchStrip}

      <div class="rails-container">
        ${cwSection}
        ${premiereRail}
        ${reelsPreviewRail}
        ${pilotRail}
        ${altRail}
      </div>
      ${renderFooter()}
    `;

    setupRailScrollControls();
    startHeroRotation(featured);
  }

  function renderPilotCard(series) {
    const voted = Store.hasVotedPilot(series.id);
    return `
      <article class="pilot-card">
        <a class="pilot-thumb" href="#/series/${esc(series.slug)}">
          <img src="${esc(series.heroImage)}" alt="${esc(series.title)}" loading="lazy">
        </a>
        <div class="pilot-body">
          <div class="pilot-meta">${esc(series.pilot.stage)} &middot; ${esc(series.studio)}</div>
          <h3 class="pilot-title">
            <a href="#/series/${esc(series.slug)}">${esc(series.title)}</a>
          </h3>
          <p class="pilot-pitch">${esc(series.pilot.pitch)}</p>
          <div class="pilot-actions">
            <button class="btn-vote" type="button" data-action="toggle-vote" data-series="${esc(series.id)}" aria-pressed="${voted}">
              <span>${voted ? "✓ Voted" : "▲ Greenlight"}</span>
            </button>
            <button class="glass-chip" type="button" data-action="play-series" data-series="${esc(series.slug)}">Play Ep 1</button>
          </div>
        </div>
      </article>
    `;
  }

  /* ---------- View 2: Series Detail View (`#/series/:slug`) ---------- */

  function partitionLedgerRows(rows) {
    const humanRegex = /human|director|writer|producer|cast|voice|score|cinematography|production team|creator|showrunner/i;
    const humanRows = [];
    const stackRows = [];
    rows.forEach((row) => {
      if (humanRegex.test(row.label)) humanRows.push(row);
      else stackRows.push(row);
    });
    if (!humanRows.length || !stackRows.length) {
      const mid = Math.ceil(rows.length / 2);
      return { humanRows: rows.slice(0, mid), stackRows: rows.slice(mid) };
    }
    return { humanRows, stackRows };
  }

  function renderSeriesDetailView(slug, queryParams) {
    stopHeroRotation();
    const series = resolveSeries(slug);
    if (!series) {
      root.innerHTML = `
        <div class="page-shell">
          <h1 class="page-title">Series not found</h1>
          <p class="page-lede">That title isn't in the active demo catalogue.</p>
          <a class="btn-primary" href="#/">Back to Home</a>
        </div>
      `;
      return;
    }

    if (queryParams.get("tab") === "alt" && series.alternateEpisodes && series.alternateEpisodes.length) {
      detailTab = "alt";
    }
    const inList = Store.isInWatchlist(series.id);
    const prog = Store.getProgress(series.id);
    const seriesReels = Catalog.reels.filter((r) => r.seriesId === series.id);
    const isDesktop = window.matchMedia("(min-width: 52rem)").matches;

    const activeTabContent = (() => {
      if (detailTab === "alt" && series.alternateEpisodes && series.alternateEpisodes.length) {
        return `
          <p style="font-size:var(--text-xs);color:var(--ink-muted);margin:0 0 1rem;">
            Alternate Timeline demonstrates how AI-native creators on Mweshi publish parallel cuts, director branches, or alternate endings cleanly alongside Season 1.
          </p>
          <div class="episode-grid">
            ${series.alternateEpisodes.map((ep) => renderEpisodeCard(series, ep, prog, true)).join("")}
          </div>
        `;
      }
      if (detailTab === "reels" && seriesReels.length) {
        return `
          <div class="episode-grid">
            ${seriesReels
              .map(
                (r) => `
              <a class="ep-card" href="#/reels?reel=${esc(r.id)}">
                <div class="ep-card-thumb">
                  <img src="${esc(r.poster)}" alt="${esc(r.title)}" loading="lazy">
                </div>
                <div class="ep-card-info">
                  <div class="ep-card-top">
                    <h3 class="ep-card-title">Open in Reels Feed</h3>
                    <span class="ep-card-dur">9:16 Hook</span>
                  </div>
                  <p class="ep-card-desc">${esc(r.hook)}</p>
                </div>
              </a>
            `
              )
              .join("")}
          </div>
        `;
      }
      return `
        <div class="episode-grid">
          ${series.episodes.map((ep) => renderEpisodeCard(series, ep, prog, false)).join("")}
        </div>
      `;
    })();

    const ledgerRows =
      detailLedgerMode === "aispec" && series.madeWith.aiSpecExample
        ? series.madeWith.aiSpecExample
        : series.madeWith.actual;
    const { humanRows, stackRows } = partitionLedgerRows(ledgerRows);

    const hasMoreSynopsis = Boolean(series.synopsisExtended);
    const synopsisText = synopsisExpanded && hasMoreSynopsis
      ? `${esc(series.synopsis)} ${esc(series.synopsisExtended)}`
      : esc(series.synopsis);

    root.innerHTML = `
      <div class="detail-view">
        <div class="detail-top-bar">
          <button class="glass-icon-btn" type="button" data-action="go-back" aria-label="Back">
            ${ICON_BACK}
          </button>
          <button class="glass-icon-btn" type="button" data-action="share-series" data-title="${esc(series.title)}" aria-label="Copy series link" title="Share series">
            ${ICON_SHARE}
          </button>
        </div>

        <div class="detail-hero-outer">
          <section class="detail-hero">
            <img class="detail-hero-img" src="${esc(series.heroImage)}" alt="${esc(series.title)} backdrop">
            <div class="hero-scrim"></div>
            <div class="detail-hero-inner">
              <span class="hero-eyebrow-pill">${esc(series.eyebrow)}</span>
              <h1 class="hero-wordmark" data-style="${esc(series.wordmarkStyle)}">${esc(series.title)}</h1>
              <p class="hero-meta-line" style="margin-bottom:1rem;">
                <span>${esc(series.category)}</span>
                <span>&middot;</span>
                <span class="tabular">${series.year} &middot; ${series.episodes.length} Episodes (${esc(series.totalRuntimeLabel)})</span>
              </p>
              <div class="hero-cta-row">
                ${renderSmartPlayPill(series)}
                <button class="btn-circle-glass" type="button" data-action="toggle-watchlist" data-series="${esc(series.id)}" aria-pressed="${inList}" aria-label="${inList ? "Remove from Library" : "Add to Library"}" title="${inList ? "In Library" : "Add to Library"}">
                  ${inList ? ICON_CHECK : ICON_PLUS}
                </button>
                ${
                  series.pilot && series.pilot.enabled
                    ? `<button class="btn-vote btn-vote--cinema" style="height:2.85rem;padding:0 1.05rem;" type="button" data-action="toggle-vote" data-series="${esc(series.id)}" aria-pressed="${Store.hasVotedPilot(series.id)}">
                        ${Store.hasVotedPilot(series.id) ? "✓ Voted" : "▲ Greenlight"}
                      </button>`
                    : ""
                }
              </div>
            </div>
          </section>
        </div>

        <section class="detail-synopsis-wrap">
          <p class="detail-synopsis">
            ${synopsisText}
            ${
              hasMoreSynopsis
                ? `<button class="inline-more-btn" type="button" data-action="toggle-synopsis">${synopsisExpanded ? "Less" : "More"}</button>`
                : ""
            }
          </p>
          <div class="spec-strip tabular">
            ${(series.badges || [])
              .map(
                (b) =>
                  `<span class="spec-badge ${b.includes("C2PA") || b === "PILOT" || b === "UNLISTED" ? "spec-badge--gold" : ""}">${esc(b)}</span>`
              )
              .join("")}
          </div>
        </section>

        <div class="detail-body">
          <div class="seg-tabs-scroll">
            <div class="seg-tabs" role="tablist" aria-label="Series sections">
              <button class="seg-tab" type="button" role="tab" aria-selected="${detailTab === "episodes"}" data-action="detail-tab" data-tab="episodes">
                Season 1 (${series.episodes.length})
              </button>
              ${
                series.alternateEpisodes && series.alternateEpisodes.length
                  ? `<button class="seg-tab" type="button" role="tab" aria-selected="${detailTab === "alt"}" data-action="detail-tab" data-tab="alt">
                      Alternate Timeline (${series.alternateEpisodes.length})
                    </button>`
                  : ""
              }
              ${
                seriesReels.length
                  ? `<button class="seg-tab" type="button" role="tab" aria-selected="${detailTab === "reels"}" data-action="detail-tab" data-tab="reels">
                      Scene Reels (${seriesReels.length})
                    </button>`
                  : ""
              }
            </div>
          </div>

          ${activeTabContent}

          <!-- How to Watch Box (Bespoke Aperture M Emblem) -->
          <div class="how-to-watch-box">
            <div class="htw-left">
              <div class="htw-app-icon">${ICON_APERTURE_M}</div>
              <div style="min-width:0;">
                <div style="font-size:var(--text-sm);font-weight:var(--w-semibold);color:var(--ink);">
                  ${series.isUnlistedScreener ? "Private Unlisted Creator Screener" : "Stream on Mweshi · Open Architecture Demo"}
                </div>
                <div style="font-size:var(--text-xs);color:var(--ink-muted);">
                  ${
                    series.isUnlistedScreener
                      ? "Prepared solely for creator preview. Zero rights claimed without your sign-off."
                      : "Sequential episodes, saved inline resume timestamps, and transparent Made With provenance."
                  }
                </div>
              </div>
            </div>
            ${
              series.isUnlistedScreener
                ? `<a class="btn-primary" style="height:2.4rem;padding:0 1rem;font-size:var(--text-xs);" href="#/creators">Reply / Claim Series</a>`
                : `<button class="btn-primary" style="height:2.4rem;padding:0 1.05rem;font-size:var(--text-xs);" type="button" data-action="play-series" data-series="${esc(series.slug)}">Play Now</button>`
            }
          </div>

          <!-- Signature Two-Column "Made With & Provenance" Dossier -->
          <section class="provenance-dossier" aria-labelledby="ledger-madewith">
            <div class="ledger-head">
              <h2 class="ledger-title" id="ledger-madewith">Made With &amp; Provenance</h2>
              <div class="seg-tabs" style="margin-bottom:0;">
                <button class="seg-tab" type="button" aria-selected="${detailLedgerMode === "actual"}" data-action="ledger-mode" data-mode="actual">
                  Actual Credits
                </button>
                <button class="seg-tab" type="button" aria-selected="${detailLedgerMode === "aispec"}" data-action="ledger-mode" data-mode="aispec">
                  AI Series Spec
                </button>
              </div>
            </div>

            <p class="provenance-notice">
              ${
                detailLedgerMode === "aispec"
                  ? "Previewing Mweshi's native AI Series Provenance Schema: every AI-made show on Mweshi credits both the human filmmakers (writing, voice, editorial hours) and the exact generative models used."
                  : esc(series.madeWith.demoNotice)
              }
            </p>

            <div class="dossier-columns">
              <div>
                <h3 class="dossier-group-label">Human Craft &amp; Creative Team</h3>
                <dl class="ledger-dl">
                  ${humanRows
                    .map(
                      (row) => `
                    <div class="ledger-item">
                      <dt>${esc(row.label)}</dt>
                      <dd>${esc(row.value)}</dd>
                    </div>
                  `
                    )
                    .join("")}
                </dl>
              </div>
              <div>
                <h3 class="dossier-group-label">Pipeline, Stack &amp; Verification</h3>
                <dl class="ledger-dl">
                  ${stackRows
                    .map(
                      (row) => `
                    <div class="ledger-item">
                      <dt>${esc(row.label)}</dt>
                      <dd>${esc(row.value)}</dd>
                    </div>
                  `
                    )
                    .join("")}
                </dl>
              </div>
            </div>
          </section>

          <!-- Compact 3-Column Desktop / Native Accordion Mobile Metadata -->
          <div class="detail-meta-grid">
            <details class="meta-panel" ${isDesktop ? "open" : ""}>
              <summary>Information</summary>
              <div class="meta-panel-body">
                <dl class="ledger-dl">
                  <div class="ledger-item"><dt>Studio</dt><dd>${esc(series.studio)}</dd></div>
                  <div class="ledger-item"><dt>Released</dt><dd class="tabular">${series.year}</dd></div>
                  <div class="ledger-item"><dt>Run Time</dt><dd class="tabular">${series.episodes.length} Episodes (${esc(series.totalRuntimeLabel)})</dd></div>
                  <div class="ledger-item"><dt>Rated &amp; Origin</dt><dd>${esc(series.rating)} &middot; ${esc(series.region)}</dd></div>
                </dl>
              </div>
            </details>

            <details class="meta-panel" ${isDesktop ? "open" : ""}>
              <summary>Languages</summary>
              <div class="meta-panel-body">
                <dl class="ledger-dl">
                  <div class="ledger-item"><dt>Original Audio</dt><dd>${esc(series.languages.originalAudio)}</dd></div>
                  <div class="ledger-item"><dt>Audio</dt><dd>${esc(series.languages.audio)}</dd></div>
                  <div class="ledger-item"><dt>Subtitles</dt><dd>${esc(series.languages.subtitles)}</dd></div>
                </dl>
              </div>
            </details>

            <details class="meta-panel" ${isDesktop ? "open" : ""}>
              <summary>Accessibility</summary>
              <div class="meta-panel-body">
                <div class="a11y-block">
                  <span class="spec-badge">SDH</span>
                  <p>Subtitles for the Deaf and Hard-of-Hearing include dialogue plus relevant sound cues.</p>
                </div>
                <div class="a11y-block">
                  <span class="spec-badge">AD</span>
                  <p>Audio descriptions narrate key visual scenes for viewers who are blind or have low vision.</p>
                </div>
              </div>
            </details>
          </div>
        </div>
        ${renderFooter()}
      </div>
    `;

    if (queryParams.get("play") === "1") {
      openSeriesPlayback(series);
    }
  }

  function renderEpisodeCard(series, ep, prog, isAlt) {
    let pct = 0;
    if (prog && prog.episodeId === ep.id) {
      pct = Math.min(100, Math.max(6, Math.round((prog.positionSec / Math.max(1, ep.durationSec)) * 100)));
    } else if (!isAlt && prog && prog.episodeNumber > ep.number) {
      pct = 100;
    }

    const titleLabel = isAlt ? `${ep.branchLabel || "Cut"}: ${ep.title}` : `${ep.number}. ${ep.title}`;

    return `
      <button class="ep-card" type="button" data-action="play-episode" data-series="${esc(series.slug)}" data-ep="${esc(ep.id)}" data-alt="${isAlt ? "1" : "0"}">
        <div class="ep-card-thumb">
          <img src="${esc(ep.thumb)}" alt="Episode ${ep.number}: ${esc(ep.title)}" loading="lazy">
          ${pct > 0 ? `<div class="ep-card-progress"><span style="width:${pct}%"></span></div>` : ""}
        </div>
        <div class="ep-card-info">
          <div class="ep-card-top">
            <h3 class="ep-card-title">${esc(titleLabel)}</h3>
            <span class="ep-card-dur tabular">${formatDurationHuman(ep.durationSec)}</span>
          </div>
          <p class="ep-card-desc">${esc(ep.synopsis)}</p>
        </div>
      </button>
    `;
  }

  /* ---------- View 3: Immersive Darkroom Vertical 9:16 Reels Feed (`#/reels`) ---------- */

  function renderReelsView(queryParams) {
    stopHeroRotation();
    disconnectReelsObserver();

    const targetReelId = queryParams.get("reel");
    const orderedReels = [...Catalog.reels];
    if (targetReelId) {
      const idx = orderedReels.findIndex((r) => r.id === targetReelId);
      if (idx > 0) {
        const [picked] = orderedReels.splice(idx, 1);
        orderedReels.unshift(picked);
      }
    }

    const total = orderedReels.length;

    root.innerHTML = `
      <section class="reels-stage" id="reels-stage" aria-label="Vertical Scene Reels Discovery">
        ${orderedReels
          .map((reel, idx) => {
            const series = Catalog.getSeriesBySlug(reel.seriesId);
            const inList = series ? Store.isInWatchlist(series.id) : false;
            const mediaSrc = `${reel.streamUrl}#t=${reel.startSec},${reel.endSec}`;
            return `
              <article class="reel-slide" data-reel-index="${idx}" data-reel-id="${esc(reel.id)}" data-start="${reel.startSec}" data-end="${reel.endSec}">
                <div class="reel-stage-inner">
                  <div class="reel-frame">
                    <video class="reel-video" playsinline preload="${idx === 0 ? "auto" : "none"}" poster="${esc(reel.poster)}" ${reelsMuted ? "muted" : ""} data-src="${esc(mediaSrc)}" ${idx === 0 ? `src="${esc(mediaSrc)}"` : ""}></video>
                    <div class="reel-scrim"></div>
                    <div class="reel-counter-pill tabular" aria-label="Reel ${idx + 1} of ${total}">${idx + 1} / ${total}</div>

                    <div class="reel-overlay">
                      <div class="reel-info">
                        <div class="reel-tag">${esc(reel.tag)}</div>
                        <h2 class="reel-title">${esc(reel.title)}</h2>
                        <p class="reel-hook">${esc(reel.hook)}</p>
                        <div style="display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;">
                          <button class="btn-play-white" style="height:2.55rem;min-width:auto;padding:0 1.1rem;font-size:var(--text-xs);" type="button" data-action="play-episode" data-series="${esc(reel.seriesId)}" data-ep="${esc(reel.episodeId)}">
                            ${ICON_PLAY}
                            <span>Watch Full Episode</span>
                          </button>
                          <a class="glass-chip glass-chip--cinema" style="height:2.55rem;padding:0 0.95rem;" href="#/series/${esc(reel.seriesId)}">
                            All Episodes
                          </a>
                        </div>
                      </div>

                      <div class="reel-rail-actions">
                        <div class="reel-action-group">
                          <button class="glass-icon-btn" type="button" data-action="toggle-reels-mute" aria-label="${reelsMuted ? "Unmute sound" : "Mute sound"}">
                            <span data-mute-icon style="display:inline-flex;width:1.15rem;height:1.15rem;">${reelsMuted ? ICON_VOL_OFF : ICON_VOL_ON}</span>
                          </button>
                          <span class="reel-action-label" data-mute-text>${reelsMuted ? "Muted" : "Sound"}</span>
                        </div>

                        <div class="reel-action-group">
                          <button class="glass-icon-btn" type="button" data-action="toggle-watchlist" data-series="${esc(reel.seriesId)}" aria-pressed="${inList}" aria-label="${inList ? "Remove from Library" : "Save series"}">
                            ${inList ? ICON_CHECK : ICON_PLUS}
                          </button>
                          <span class="reel-action-label">${inList ? "Saved" : "My List"}</span>
                        </div>

                        <div class="reel-action-group">
                          <button class="glass-icon-btn" type="button" data-action="open-provenance-sheet" data-series="${esc(reel.seriesId)}" aria-label="Made With Provenance">
                            ${ICON_INFO}
                          </button>
                          <span class="reel-action-label">Made With</span>
                        </div>
                      </div>
                    </div>

                    <div class="reel-progress-track" aria-hidden="true">
                      <div class="reel-progress-fill" data-reel-progress></div>
                    </div>
                  </div>

                  <div class="reel-desktop-nav" aria-label="Reel navigation">
                    <button class="glass-icon-btn" type="button" data-action="reel-step" data-step="-1" aria-label="Previous reel" ${idx === 0 ? "disabled style='opacity:0.35;cursor:default;'" : ""}>
                      ${ICON_CHEVRON_UP}
                    </button>
                    <button class="glass-icon-btn" type="button" data-action="reel-step" data-step="1" aria-label="Next reel" ${idx === total - 1 ? "disabled style='opacity:0.35;cursor:default;'" : ""}>
                      ${ICON_CHEVRON_DOWN}
                    </button>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </section>
    `;

    setupReelsObserver();
  }

  function stepReel(delta) {
    const stage = document.getElementById("reels-stage");
    if (!stage) return;
    const slideH = stage.clientHeight || window.innerHeight;
    const current = Math.round(stage.scrollTop / slideH);
    const slides = stage.querySelectorAll(".reel-slide");
    const target = Math.max(0, Math.min(slides.length - 1, current + delta));
    if (slides[target]) {
      slides[target].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setupReelsObserver() {
    const slides = document.querySelectorAll(".reel-slide");
    if (!slides.length) return;

    slides.forEach((slide) => {
      const vid = slide.querySelector("video");
      const progressFill = slide.querySelector("[data-reel-progress]");
      const start = Number(slide.dataset.start) || 0;
      const end = Number(slide.dataset.end) || start + 30;
      const span = Math.max(1, end - start);
      if (!vid) return;

      vid.addEventListener("loadedmetadata", () => {
        if (vid.currentTime < start || vid.currentTime >= end) {
          try { vid.currentTime = start; } catch (_) {}
        }
      });

      vid.addEventListener("timeupdate", () => {
        if (progressFill) {
          const pct = Math.max(0, Math.min(100, ((vid.currentTime - start) / span) * 100));
          progressFill.style.width = `${pct}%`;
        }
        if (vid.currentTime >= end) {
          vid.currentTime = start;
          vid.play().catch(() => {});
        }
      });

      vid.addEventListener("click", () => {
        if (vid.paused) vid.play().catch(() => {});
        else vid.pause();
      });
    });

    reelsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target.querySelector("video");
          const start = Number(entry.target.dataset.start) || 0;
          if (!vid) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            if (!vid.getAttribute("src") && vid.dataset.src) {
              vid.setAttribute("src", vid.dataset.src);
              vid.load();
            }
            vid.muted = reelsMuted;
            if (vid.currentTime < start) {
              try { vid.currentTime = start; } catch (_) {}
            }
            vid.play().catch(() => {});
          } else {
            if (entry.isIntersecting && !vid.getAttribute("src") && vid.dataset.src) {
              vid.setAttribute("src", vid.dataset.src);
            }
            vid.pause();
          }
        });
      },
      { threshold: [0.25, 0.65] }
    );

    slides.forEach((s) => reelsObserver.observe(s));
  }

  function disconnectReelsObserver() {
    if (reelsObserver) {
      reelsObserver.disconnect();
      reelsObserver = null;
    }
    document.querySelectorAll(".reel-video").forEach((v) => {
      try { v.pause(); } catch (_) {}
    });
  }

  /* ---------- View 4: Pilot Season Slate (`#/pilots`) ---------- */

  function renderPilotsView() {
    stopHeroRotation();
    const pilots = Catalog.series.filter((s) => s.pilot && s.pilot.enabled);
    root.innerHTML = `
      <div class="page-shell">
        <span class="hero-eyebrow-pill">Audience Greenlight Program</span>
        <h1 class="page-title">Pilot Season</h1>
        <p class="page-lede">
          Great AI storytellers shouldn't have to guess whether Episode 2 is worth sixty hours of generation and editing. Creators premiere Pilot Episode 1 here; viewers watch and cast 1-per-account greenlight votes to back full seasons.
        </p>

        <div class="pilot-grid">
          ${pilots.map(renderPilotCard).join("")}
        </div>

        <div class="glass-panel">
          <h2>Making a serialized AI pilot?</h2>
          <p style="color:var(--ink-secondary);font-size:var(--text-sm);max-width:44rem;margin:0 0 1.1rem;">
            Keep 100% of your IP, keep posting short vertical hooks on TikTok, Reels, and YouTube Shorts, and make Mweshi the home where viewers binge full episodes in sequence.
          </p>
          <a class="btn-primary" href="#/creators">Apply for the Founding Slate</a>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  /* ---------- View 5: Library (`#/library`) ---------- */

  function renderLibraryView() {
    stopHeroRotation();
    const st = Store.getState();
    const savedSeries = st.watchlist.map(resolveSeries).filter(Boolean);
    const cwList = Store.getContinueWatchingList();

    root.innerHTML = `
      <div class="page-shell">
        <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;">
          <div>
            <h1 class="page-title">Library</h1>
            <p class="page-lede" style="margin-bottom:0;">Your saved Watchlist and Continue Watching progress, stored privately in this browser.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.55rem;">
            <button class="glass-chip" type="button" data-action="open-cloud-sheet">Storage Info</button>
            <button class="glass-chip" type="button" data-action="reset-progress">Reset Demo Progress</button>
          </div>
        </div>

        ${
          cwList.length
            ? `
          <h2 class="rail-title" style="margin:0 0 0.9rem;">Continue Watching</h2>
          <div class="rail-scroller" style="padding-inline:0;margin-bottom:2.25rem;">
            ${cwList.map(renderContinueWatchingCard).join("")}
          </div>
        `
            : ""
        }

        <h2 class="rail-title" style="margin:0 0 0.9rem;">Watchlist (${savedSeries.length})</h2>
        ${
          savedSeries.length
            ? `<div class="poster-grid" style="margin-bottom:2.5rem;">${savedSeries.map(renderPosterCard).join("")}</div>`
            : `<div class="glass-panel" style="margin-bottom:2.5rem;">
                <p style="margin:0 0 0.85rem;color:var(--ink-secondary);font-size:var(--text-sm);">Your Watchlist is empty. Tap <strong>+</strong> on any series or vertical Reel to save it here.</p>
                <a class="glass-chip" href="#/">Browse Premiere Slate</a>
              </div>`
        }
      </div>
      ${renderFooter()}
    `;
  }

  /* ---------- View 6: Search (`#/search`) ---------- */

  function renderSearchView() {
    stopHeroRotation();
    const q = searchQuery.trim().toLowerCase();
    const matches = !q
      ? Catalog.series
      : Catalog.series.filter((s) => {
          const hay = [
            s.title,
            s.category,
            s.studio,
            s.synopsis,
            ...(s.episodes || []).map((e) => `${e.title} ${e.synopsis}`),
            ...(s.madeWith.actual || []).map((m) => m.value)
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });

    root.innerHTML = `
      <div class="page-shell">
        <h1 class="page-title">Search</h1>
        <p class="page-lede">Search series, episode titles, crew credits, or genres.</p>

        <div class="search-bar-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.2" y2="16.2"/></svg>
          <input type="search" id="search-input" placeholder="Try Tears of Steel, Cyberpunk, Ian Hubert, Pilot..." value="${esc(searchQuery)}" autocomplete="off">
        </div>

        <div class="poster-grid" id="search-results-grid">
          ${
            matches.length
              ? matches.map(renderPosterCard).join("")
              : `<p style="color:var(--ink-muted);grid-column:1/-1;">No matching series for &ldquo;${esc(searchQuery)}&rdquo;.</p>`
          }
        </div>
      </div>
      ${renderFooter()}
    `;

    const input = document.getElementById("search-input");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        const nq = searchQuery.trim().toLowerCase();
        const filtered = !nq
          ? Catalog.series
          : Catalog.series.filter((s) =>
              [
                s.title,
                s.category,
                s.studio,
                s.synopsis,
                ...(s.episodes || []).map((ep) => `${ep.title} ${ep.synopsis}`),
                ...(s.madeWith.actual || []).map((m) => m.value)
              ]
                .join(" ")
                .toLowerCase()
                .includes(nq)
            );
        const grid = document.getElementById("search-results-grid");
        if (grid) {
          grid.innerHTML = filtered.length
            ? filtered.map(renderPosterCard).join("")
            : `<p style="color:var(--ink-muted);grid-column:1/-1;">No matching series for &ldquo;${esc(searchQuery)}&rdquo;.</p>`;
        }
      });
    }
  }

  /* ---------- View 7: Public For Creators (`#/creators`) — Clean mailto + Copy Summary ---------- */

  function buildPitchConfirmationHTML(draft) {
    return `
      <div class="pitch-confirm-box" id="pitch-confirm-box">
        <div style="font-size:var(--text-xs);font-weight:var(--w-semibold);color:var(--provenance);letter-spacing:0.06em;text-transform:uppercase;">
          Pitch Ready to Send
        </div>
        <p style="margin:0;font-size:var(--text-sm);color:var(--ink);line-height:1.5;">
          Your pitch summary is saved locally. Open a pre-filled email draft to <strong>hello@mweshi.com</strong> or copy the formatted summary below:
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:0.6rem;">
          <a class="btn-primary" style="height:2.55rem;padding:0 1.15rem;font-size:var(--text-xs);" href="${esc(draft.mailtoHref)}">
            Open Email Draft (hello@mweshi.com)
          </a>
          <button class="glass-chip" type="button" id="copy-pitch-summary-btn" style="height:2.55rem;">
            Copy Pitch Summary
          </button>
        </div>
        <pre style="margin:0;padding:0.75rem;border-radius:var(--r-sm);background:var(--bg);border:1px solid var(--hairline);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:0.74rem;color:var(--ink-secondary);white-space:pre-wrap;word-break:break-word;">${esc(draft.summaryText)}</pre>
      </div>
    `;
  }

  function renderCreatorsView() {
    stopHeroRotation();
    root.innerHTML = `
      <div class="page-shell">
        <span class="hero-eyebrow-pill">Founding Cohort &middot; Co-Written Terms</span>
        <h1 class="page-title">A cinema home for serialized AI storytellers.</h1>
        <p class="page-lede">
          Short-form feeds reward five-second hooks, then bury Episode 3 behind unrelated clips. Mweshi gives your world a dedicated cinema series page: seasons in sequence, vertical Reels that funnel straight into Episode 1, and transparent provenance.
        </p>

        <div class="creator-grid">
          <section class="glass-panel">
            <h2>Founding Creator Terms</h2>
            <ul class="clean-list">
              <li><strong>100% Creator-Owned IP</strong> &mdash; You keep your characters, world, and adaptation rights. Always.</li>
              <li><strong>Non-Exclusive Social Funnel</strong> &mdash; Keep posting vertical hooks on TikTok, Reels, X, and YouTube Shorts to drive viewers into your full series.</li>
              <li><strong>Co-Written Founding Terms</strong> &mdash; Revenue share, compute support, and premiere windows are being shaped directly with our first cohort rather than handed down.</li>
              <li><strong>Honest Made-With Dossier</strong> &mdash; Every title credits your human writing, voice cast, editorial hours, and generative stack openly.</li>
            </ul>
            <div style="margin-top:1.25rem;display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">
              <a class="btn-primary" style="height:2.45rem;padding:0 1.1rem;font-size:var(--text-xs);" href="mailto:hello@mweshi.com?subject=${encodeURIComponent("Mweshi Founding Creator Inquiry")}">Email hello@mweshi.com</a>
              <button class="glass-chip" type="button" data-action="copy-email" style="height:2.45rem;">Copy Email</button>
              <a class="glass-chip" href="letter/" style="height:2.45rem;">Read Founder's Letter &rarr;</a>
            </div>
          </section>

          <section class="glass-panel">
            <h2>Submit a Pilot or Book 15 Mins</h2>
            <form class="form-stack" id="creator-pitch-form">
              <div class="form-row-2">
                <label>Your Name or Studio *
                  <input type="text" name="creatorName" required maxlength="120" placeholder="e.g. Studio Kora">
                </label>
                <label>Email *
                  <input type="email" name="email" required maxlength="200" placeholder="you@domain.com">
                </label>
              </div>
              <div class="form-row-2">
                <label>Series / Pilot Title
                  <input type="text" name="seriesTitle" maxlength="200" placeholder="e.g. Glass Meridian">
                </label>
                <label>TikTok / YouTube / X Handle
                  <input type="text" name="channelUrl" maxlength="500" placeholder="@handle or channel URL">
                </label>
              </div>
              <label>Episode 1 / Pilot Link (YouTube, Vimeo, Drive)
                <input type="url" name="pilotUrl" maxlength="500" placeholder="https://...">
              </label>
              <label>Tools &amp; Human Workflow (for your Made With card)
                <input type="text" name="toolsUsed" maxlength="400" placeholder="e.g. Kling, Runway, DaVinci Resolve, human voice cast">
              </label>
              <label>Notes or Preferred 15-Min Chat Window
                <textarea name="notes" maxlength="1500" placeholder="Tell Victor about your series arc, episode count, or what terms would make Mweshi worth your time."></textarea>
              </label>
              <button class="btn-primary" type="submit" style="width:100%;">Prepare Pitch for hello@mweshi.com</button>
            </form>

            <div id="pitch-confirm-slot">
              ${lastPitchDraft ? buildPitchConfirmationHTML(lastPitchDraft) : ""}
            </div>
          </section>
        </div>
      </div>
      ${renderFooter()}
    `;

    bindCreatorPitchForm();
  }

  function bindPitchCopyButton() {
    const copyBtn = document.getElementById("copy-pitch-summary-btn");
    if (copyBtn && lastPitchDraft) {
      copyBtn.onclick = () => {
        navigator.clipboard
          .writeText(lastPitchDraft.summaryText)
          .then(() => showToast("Pitch summary copied to clipboard"))
          .catch(() => showToast("Select and copy the summary box below"));
      };
    }
  }

  function bindCreatorPitchForm() {
    bindPitchCopyButton();
    const pitchForm = document.getElementById("creator-pitch-form");
    if (!pitchForm) return;

    pitchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(pitchForm);
      const payload = {
        creatorName: String(fd.get("creatorName") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        seriesTitle: String(fd.get("seriesTitle") || "").trim(),
        channelUrl: String(fd.get("channelUrl") || "").trim(),
        pilotUrl: String(fd.get("pilotUrl") || "").trim(),
        toolsUsed: String(fd.get("toolsUsed") || "").trim(),
        notes: String(fd.get("notes") || "").trim(),
        preferredTime: ""
      };
      await Store.submitCreatorPitch(payload);

      const summaryText = [
        `Creator / Studio: ${payload.creatorName}`,
        `Email: ${payload.email}`,
        payload.seriesTitle ? `Series / Pilot: ${payload.seriesTitle}` : null,
        payload.channelUrl ? `Channel: ${payload.channelUrl}` : null,
        payload.pilotUrl ? `Pilot Link: ${payload.pilotUrl}` : null,
        payload.toolsUsed ? `Tools & Workflow: ${payload.toolsUsed}` : null,
        "",
        "Notes:",
        payload.notes || "(none)"
      ]
        .filter((line) => line !== null)
        .join("\n");

      const subject = payload.seriesTitle
        ? `Mweshi Founding Creator Pitch — ${payload.seriesTitle}`
        : `Mweshi Founding Creator Pitch — ${payload.creatorName}`;
      const mailtoHref = `mailto:hello@mweshi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summaryText)}`;

      lastPitchDraft = { summaryText, mailtoHref };

      const slot = document.getElementById("pitch-confirm-slot");
      if (slot) {
        slot.innerHTML = buildPitchConfirmationHTML(lastPitchDraft);
        bindPitchCopyButton();
        slot.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      pitchForm.reset();
      showToast("Pitch prepared — open email draft or copy summary");
    });
  }

  /* ---------- View 8: Unlisted Founder Studio (`#/studio`) — DM Screener Builder ---------- */

  function renderStudioView() {
    stopHeroRotation();
    const st = Store.getState();

    root.innerHTML = `
      <div class="page-shell">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.5rem;">
          <span class="hero-eyebrow-pill" style="margin-bottom:0;">Unlisted Founder Tool &middot; #/studio</span>
          <span class="spec-badge spec-badge--gold">NOT PUBLICLY LINKED</span>
        </div>
        <h1 class="page-title">Private Creator Screener Studio</h1>
        <p class="page-lede">
          Generate an unlisted cinema-grade preview URL for TikTok, YouTube, or email outreach so creators can experience how their series plays on Mweshi — clearly labeled as a private preview with zero claim on their work.
        </p>

        <section class="glass-panel" style="margin-bottom:2rem;">
          <h2>Build Unlisted Screener Link</h2>
          <form class="form-stack" id="screener-builder-form">
            <div class="form-row-auto">
              <label>Creator Handle / Name *
                <input type="text" name="creator" required maxlength="80" placeholder="e.g. @neuralcinema">
              </label>
              <label>Series Title *
                <input type="text" name="title" required maxlength="90" placeholder="e.g. Neon Covenant">
              </label>
              <label>Genre Line
                <input type="text" name="genre" maxlength="70" placeholder="Sci-Fi · Thriller · Serialized AI">
              </label>
            </div>
            <div class="form-row-2">
              <label>YouTube URL / ID or Direct .mp4 URL *
                <input type="text" name="video" required placeholder="https://www.youtube.com/watch?v=... or .mp4 URL">
              </label>
              <label>Episode Titles (comma-separated)
                <input type="text" name="episodes" placeholder="Episode 1: The Signal, Episode 2: Blackout, Episode 3: Protocol">
              </label>
            </div>
            <label>Short Synopsis / Personalization Note
              <input type="text" name="synopsis" maxlength="320" placeholder="Optional 1-2 sentence logline for their preview hero...">
            </label>
            <div>
              <button class="btn-primary" type="submit">Generate Unlisted Screener Link</button>
            </div>
          </form>

          <div id="screener-output" hidden class="pitch-confirm-box"></div>
        </section>

        ${
          st.screeners.length
            ? `
          <h2 class="rail-title" style="margin:0 0 0.9rem;">Saved Local Screeners (${st.screeners.length})</h2>
          <div class="creator-grid" style="margin-top:0;">
            ${st.screeners
              .map(
                (sc) => `
              <div class="glass-panel">
                <div style="font-size:var(--text-xs);color:var(--provenance);font-weight:600;margin-bottom:0.25rem;">Unlisted Screener</div>
                <h3 style="margin:0 0 0.3rem;">${esc(sc.title)}</h3>
                <p style="margin:0 0 0.85rem;font-size:var(--text-xs);color:var(--ink-muted);">Prepared for ${esc(sc.creator)}</p>
                <a class="glass-chip" href="${esc(sc.url)}">Open Preview Stage</a>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
      ${renderFooter()}
    `;

    bindStudioForm();
  }

  function bindStudioForm() {
    const scrForm = document.getElementById("screener-builder-form");
    const scrOut = document.getElementById("screener-output");
    if (!scrForm || !scrOut) return;

    scrForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(scrForm);
      const epsRaw = String(fd.get("episodes") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const spec = {
        creator: String(fd.get("creator") || "").trim(),
        title: String(fd.get("title") || "").trim(),
        genre: String(fd.get("genre") || "Serialized AI Original").trim(),
        video: String(fd.get("video") || "").trim(),
        synopsis: String(fd.get("synopsis") || "").trim(),
        episodes: epsRaw.length ? epsRaw : ["Episode 1 — Pilot", "Episode 2 — Continuation (Slot)"]
      };

      const token = encodeBase64Url(spec);
      const base = `${window.location.origin}${window.location.pathname}`;
      const fullUrl = `${base}?screener=${token}#/series/screener`;

      const dmCopy = `Hey ${spec.creator} — been watching "${spec.title}" and loved the worldbuilding. I'm building Mweshi, a dedicated streaming home strictly for serialized AI shows so episodes play in order instead of getting buried in short-form feeds. Put together a private unlisted preview of how "${spec.title}" looks on a cinema stage: ${fullUrl} — zero claim on your work, just wanted to show you and get your take if you have 2 mins.`;

      Store.saveLocalScreener({
        slug: `screener-${Date.now()}`,
        creator: spec.creator,
        title: spec.title,
        url: fullUrl
      });

      scrOut.hidden = false;
      scrOut.innerHTML = `
        <div style="font-size:var(--text-xs);color:var(--provenance);font-weight:600;">Private Screener Ready</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <input type="text" readonly value="${esc(fullUrl)}" style="flex:1;min-width:12rem;padding:0.55rem 0.75rem;border-radius:8px;background:var(--bg);border:1px solid var(--hairline-strong);color:var(--ink);font-size:var(--text-xs);">
          <button class="glass-chip" type="button" id="copy-screener-url">Copy URL</button>
          <a class="btn-primary" style="height:2.3rem;padding:0 1rem;font-size:var(--text-xs);" href="${esc(fullUrl)}">Preview Stage</a>
        </div>
        <div style="font-size:var(--text-xs);color:var(--ink-muted);">Ready-to-paste DM outreach script:</div>
        <textarea readonly style="width:100%;min-height:4.8rem;padding:0.65rem;border-radius:8px;background:var(--bg);border:1px solid var(--hairline-strong);color:var(--ink-secondary);font-size:var(--text-xs);">${esc(dmCopy)}</textarea>
        <div><button class="glass-chip" type="button" id="copy-screener-dm">Copy DM Script</button></div>
      `;

      document.getElementById("copy-screener-url").onclick = () => {
        navigator.clipboard.writeText(fullUrl).then(() => showToast("Screener link copied"));
      };
      document.getElementById("copy-screener-dm").onclick = () => {
        navigator.clipboard.writeText(dmCopy).then(() => showToast("DM script copied"));
      };
    });
  }

  /* ---------- Edge-to-Edge Cinema Player ---------- */

  function setPlayerStatus(mode, msg) {
    if (!playerStatusEl) return;
    if (mode === "hidden") {
      playerStatusEl.hidden = true;
      playerStatusEl.classList.remove("is-interactive");
      return;
    }
    playerStatusEl.hidden = false;
    playerStatusMsg.textContent = msg || "Loading episode stream…";
    if (mode === "error") {
      playerSpinnerEl.hidden = true;
      playerRetryBtn.hidden = false;
      playerStatusEl.classList.add("is-interactive");
    } else {
      playerSpinnerEl.hidden = false;
      playerRetryBtn.hidden = true;
      playerStatusEl.classList.remove("is-interactive");
    }
  }

  function openSeriesPlayback(series) {
    if (!series) return;
    const prog = Store.getProgress(series.id);
    if (prog && !prog.completed) {
      const ep = Catalog.getEpisode(series, prog.episodeId) || series.episodes[0];
      openEpisodePlayer(series, ep, false, prog.positionSec);
    } else {
      openEpisodePlayer(series, series.episodes[0], false, 0);
    }
  }

  function openEpisodePlayer(series, episode, isAlternate, resumeOffsetSec) {
    if (!series || !episode) return;
    disconnectReelsObserver();
    stopHeroRotation();

    playerSession.open = true;
    playerSession.series = series;
    playerSession.episode = episode;
    playerSession.isAlternate = Boolean(isAlternate);
    playerSession.endedReached = false;
    playerSession.upnextDismissed = false;

    playerModal.hidden = false;
    upnextEl.hidden = true;
    document.body.style.overflow = "hidden";

    playerSeriesLabel.textContent = series.title;
    playerEpLabel.textContent = isAlternate
      ? `${episode.branchLabel || "Alternate Cut"} · ${episode.title}`
      : `S${episode.season}, E${episode.number} · ${episode.title}`;

    /* YouTube-backed Unlisted Creator Screener */
    if (episode.youtubeId) {
      videoEl.pause();
      videoEl.hidden = true;
      iframeEl.hidden = false;
      playerBottomChrome.hidden = true;
      playerTestEndBtn.hidden = true;
      setPlayerStatus("hidden");
      iframeEl.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.youtubeId)}?autoplay=1&rel=0&modestbranding=1`;
      return;
    }

    iframeEl.hidden = true;
    iframeEl.src = "";
    videoEl.hidden = false;
    videoEl.poster = episode.thumb || series.heroImage || "";
    playerBottomChrome.hidden = false;
    playerTestEndBtn.hidden = !isDebugMode;

    const targetStart = (episode.startSec || 0) + Math.max(0, Math.min((episode.durationSec || 180) - 4, Number(resumeOffsetSec) || 0));

    const startPlayback = () => {
      try {
        videoEl.currentTime = targetStart;
      } catch (_) {}
      videoEl.play().catch(() => {});
      updatePlayerScrubberUI();
    };

    setPlayerStatus("loading", `Loading ${series.title} · ${episode.title}…`);

    if (videoEl.getAttribute("data-src") !== episode.streamUrl) {
      videoEl.setAttribute("data-src", episode.streamUrl);
      videoEl.src = episode.streamUrl;
      videoEl.load();
      videoEl.addEventListener("loadedmetadata", startPlayback, { once: true });
    } else if (videoEl.readyState >= 1) {
      startPlayback();
    } else {
      videoEl.addEventListener("loadedmetadata", startPlayback, { once: true });
    }

    bumpPlayerIdleTimer();
  }

  function getNextSequentialEpisode(series, currentEp, isAlt) {
    if (!series || isAlt) return null;
    const idx = series.episodes.findIndex((e) => e.id === currentEp.id);
    if (idx >= 0 && idx + 1 < series.episodes.length) {
      return series.episodes[idx + 1];
    }
    return null;
  }

  function updatePlayerScrubberUI() {
    if (!playerSession.open || !playerSession.episode || !videoEl || !iframeEl.hidden) return;
    const ep = playerSession.episode;
    const relPos = Math.max(0, Math.min(ep.durationSec, (videoEl.currentTime || 0) - (ep.startSec || 0)));
    const rem = Math.max(0, ep.durationSec - relPos);

    playerElapsed.textContent = formatClock(relPos);
    playerRemaining.textContent = `-${formatClock(rem)}`;
    playerScrubber.max = String(ep.durationSec);
    playerScrubber.value = String(relPos);
    playerPlayIcon.innerHTML = videoEl.paused
      ? `<polygon points="7 5 19 12 7 19 7 5"/>`
      : `<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>`;

    if (playerMuteIcon) {
      playerMuteIcon.innerHTML = videoEl.muted
        ? `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`
        : `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`;
    }
    if (playerMuteLabel) {
      playerMuteLabel.textContent = videoEl.muted ? "Muted" : "Sound";
    }
  }

  function showUpNextOverlay() {
    const { series, episode, isAlternate } = playerSession;
    if (!series || !episode) return;
    const nextEp = getNextSequentialEpisode(series, episode, isAlternate);

    playerModal.classList.remove("idle");
    upnextSeriesTitle.textContent = series.title;
    if (nextEp) {
      upnextEpTitle.textContent = `S${nextEp.season}, E${nextEp.number} · ${nextEp.title}`;
      upnextBtnLabel.textContent = "Next Episode";
      upnextPlayBtn.dataset.mode = "next";
    } else {
      upnextEpTitle.textContent = `Season ${episode.season} Complete · ${episode.title}`;
      upnextBtnLabel.textContent = "Back to Series";
      upnextPlayBtn.dataset.mode = "finish";
    }
    upnextEl.hidden = false;
  }

  function closePlayer(skipRouteRender) {
    if (!playerSession.open) return;
    persistCurrentPlayerProgress(false);
    videoEl.pause();
    iframeEl.src = "";
    playerSession.open = false;
    playerModal.hidden = true;
    upnextEl.hidden = true;
    setPlayerStatus("hidden");
    document.body.style.overflow = "";
    clearTimeout(playerSession.idleTimer);
    if (!skipRouteRender) renderRoute();
  }

  function persistCurrentPlayerProgress(forceComplete) {
    const { series, episode, isAlternate } = playerSession;
    if (!series || !episode || isAlternate || episode.youtubeId) return;
    const relPos = Math.max(0, Math.min(episode.durationSec, (videoEl.currentTime || 0) - (episode.startSec || 0)));
    if (relPos < 2 && !forceComplete) return;

    Store.saveProgress({
      seriesId: series.id,
      episodeId: episode.id,
      episodeNumber: episode.number,
      seasonNumber: episode.season,
      positionSec: forceComplete ? episode.durationSec : relPos,
      durationSec: episode.durationSec,
      completed: Boolean(forceComplete)
    });
  }

  function bumpPlayerIdleTimer() {
    playerModal.classList.remove("idle");
    clearTimeout(playerSession.idleTimer);
    if (!playerSession.open || videoEl.paused || !upnextEl.hidden) return;
    playerSession.idleTimer = setTimeout(() => {
      if (playerSession.open && !videoEl.paused && upnextEl.hidden) {
        playerModal.classList.add("idle");
      }
    }, 3200);
  }

  function bindPlayerEvents() {
    videoEl.addEventListener("waiting", () => {
      if (playerSession.open) setPlayerStatus("loading", "Buffering stream…");
    });
    videoEl.addEventListener("canplay", () => {
      if (playerSession.open) setPlayerStatus("hidden");
    });
    videoEl.addEventListener("playing", () => {
      if (playerSession.open) setPlayerStatus("hidden");
    });
    videoEl.addEventListener("error", () => {
      if (playerSession.open) {
        setPlayerStatus("error", "The external CC-BY video stream couldn't load right now. Try retrying or check your connection.");
      }
    });

    if (playerRetryBtn) {
      playerRetryBtn.addEventListener("click", () => {
        if (!playerSession.series || !playerSession.episode) return;
        videoEl.removeAttribute("data-src");
        openEpisodePlayer(playerSession.series, playerSession.episode, playerSession.isAlternate, 0);
      });
    }

    videoEl.addEventListener("timeupdate", () => {
      if (!playerSession.open || !playerSession.episode) return;
      const ep = playerSession.episode;
      updatePlayerScrubberUI();

      const now = Date.now();
      if (now - playerSession.lastSavedAtMs > 3000 && !videoEl.paused) {
        playerSession.lastSavedAtMs = now;
        persistCurrentPlayerProgress(false);
      }

      if (videoEl.currentTime >= ep.endSec - 5 && upnextEl.hidden && !playerSession.upnextDismissed) {
        showUpNextOverlay();
      }

      if (videoEl.currentTime >= ep.endSec && !playerSession.endedReached) {
        playerSession.endedReached = true;
        playerSession.upnextDismissed = false;
        videoEl.pause();
        const nextEp = getNextSequentialEpisode(playerSession.series, ep, playerSession.isAlternate);
        if (nextEp) {
          Store.saveProgress({
            seriesId: playerSession.series.id,
            episodeId: nextEp.id,
            episodeNumber: nextEp.number,
            seasonNumber: nextEp.season,
            positionSec: 4,
            durationSec: nextEp.durationSec,
            completed: false
          });
        } else {
          persistCurrentPlayerProgress(true);
        }
        showUpNextOverlay();
      }
    });

    videoEl.addEventListener("play", () => {
      updatePlayerScrubberUI();
      bumpPlayerIdleTimer();
    });
    videoEl.addEventListener("pause", () => {
      updatePlayerScrubberUI();
      playerModal.classList.remove("idle");
    });

    playerScrubber.addEventListener("input", () => {
      if (!playerSession.episode) return;
      const target = (playerSession.episode.startSec || 0) + Number(playerScrubber.value);
      playerSession.endedReached = false;
      playerSession.upnextDismissed = false;
      upnextEl.hidden = true;
      videoEl.currentTime = target;
      updatePlayerScrubberUI();
    });

    playerPlayPauseBtn.addEventListener("click", () => {
      if (videoEl.paused) videoEl.play().catch(() => {});
      else videoEl.pause();
    });

    playerBack10Btn.addEventListener("click", () => {
      if (!playerSession.episode) return;
      playerSession.endedReached = false;
      playerSession.upnextDismissed = false;
      upnextEl.hidden = true;
      videoEl.currentTime = Math.max(playerSession.episode.startSec, videoEl.currentTime - 10);
    });

    playerFwd10Btn.addEventListener("click", () => {
      if (!playerSession.episode) return;
      videoEl.currentTime = Math.min(playerSession.episode.endSec - 1, videoEl.currentTime + 10);
    });

    playerMuteBtn.addEventListener("click", () => {
      videoEl.muted = !videoEl.muted;
      updatePlayerScrubberUI();
    });

    playerAspectBtn.addEventListener("click", () => {
      const next = playerStage.dataset.aspect === "cinema" ? "feed" : "cinema";
      playerStage.dataset.aspect = next;
      playerAspectBtn.textContent = next === "cinema" ? "16:9" : "9:16";
    });

    playerTestEndBtn.addEventListener("click", () => {
      if (!playerSession.episode) return;
      playerSession.endedReached = false;
      playerSession.upnextDismissed = false;
      videoEl.currentTime = Math.max(playerSession.episode.startSec, playerSession.episode.endSec - 4.5);
      videoEl.play().catch(() => {});
      showUpNextOverlay();
    });

    playerFsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        playerModal.requestFullscreen().catch(() => {});
      }
    });

    playerProvBtn.addEventListener("click", () => {
      if (playerSession.series) openProvenanceSheet(playerSession.series);
    });

    if (upnextDismissBtn) {
      upnextDismissBtn.addEventListener("click", () => {
        playerSession.upnextDismissed = true;
        upnextEl.hidden = true;
      });
    }

    upnextPlayBtn.addEventListener("click", () => {
      const { series, episode, isAlternate } = playerSession;
      const nextEp = getNextSequentialEpisode(series, episode, isAlternate);
      if (nextEp) {
        openEpisodePlayer(series, nextEp, false, 0);
      } else {
        closePlayer(false);
      }
    });

    upnextReplayBtn.addEventListener("click", () => {
      if (!playerSession.series || !playerSession.episode) return;
      openEpisodePlayer(playerSession.series, playerSession.episode, playerSession.isAlternate, 0);
    });

    playerCloseBtn.addEventListener("click", () => closePlayer(false));
    playerModal.addEventListener("mousemove", bumpPlayerIdleTimer);
    playerModal.addEventListener("touchstart", bumpPlayerIdleTimer, { passive: true });

    window.addEventListener("keydown", (e) => {
      if (playerSession.open) {
        if (e.key === "Escape") {
          e.preventDefault();
          closePlayer(false);
        } else if (e.key === " " && document.activeElement.tagName !== "BUTTON") {
          e.preventDefault();
          if (videoEl.paused) videoEl.play().catch(() => {});
          else videoEl.pause();
        } else if (e.key === "ArrowLeft" && playerSession.episode) {
          videoEl.currentTime = Math.max(playerSession.episode.startSec, videoEl.currentTime - 10);
        } else if (e.key === "ArrowRight" && playerSession.episode) {
          videoEl.currentTime = Math.min(playerSession.episode.endSec - 1, videoEl.currentTime + 10);
        } else if (e.key.toLowerCase() === "m") {
          videoEl.muted = !videoEl.muted;
          updatePlayerScrubberUI();
        } else if (e.key.toLowerCase() === "f") {
          playerFsBtn.click();
        } else if (e.shiftKey && e.key.toLowerCase() === "e" && playerSession.episode) {
          playerSession.upnextDismissed = false;
          showUpNextOverlay();
        }
        return;
      }

      /* Reels keyboard up/down navigation */
      if (document.body.classList.contains("route-reels")) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          stepReel(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          stepReel(-1);
        }
      }
    });
  }

  /* ---------- Sheet Modals ---------- */

  function openProvenanceSheet(series) {
    if (!series || !sheet) return;
    sheetTitle.textContent = `${series.title} · Made With`;
    sheetBody.innerHTML = `
      <p class="provenance-notice" style="margin-bottom:1rem;">
        ${esc(series.madeWith.demoNotice)}
      </p>
      <dl class="ledger-dl">
        ${series.madeWith.actual
          .map(
            (r) => `
          <div class="ledger-item">
            <dt>${esc(r.label)}</dt>
            <dd>${esc(r.value)}</dd>
          </div>
        `
          )
          .join("")}
      </dl>
    `;
    sheet.showModal();
  }

  function openCloudSyncSheet() {
    if (!sheet) return;
    sheetTitle.textContent = "Saved on this browser";
    sheetBody.innerHTML = `
      <p style="margin:0 0 0.85rem;font-size:var(--text-sm);color:var(--ink-secondary);line-height:1.55;">
        Continue Watching timestamps, your Watchlist, Pilot votes, and theme preference stay privately in this browser's local storage.
      </p>
      <p style="margin:0;font-size:var(--text-xs);color:var(--ink-muted);line-height:1.55;">
        Clearing site data for this page resets that history. Creator pitches on <strong style="color:var(--ink);">For Creators</strong> prepare a pre-filled email draft to <a href="mailto:hello@mweshi.com" style="color:var(--accent);text-decoration:underline;">hello@mweshi.com</a> alongside a copyable summary.
      </p>
    `;
    sheet.showModal();
  }

  /* ---------- Router & Delegated Actions ---------- */

  function parseHash() {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [pathPart, queryPart] = raw.split("?");
    const segments = pathPart.split("/").filter(Boolean);
    const params = new URLSearchParams(queryPart || "");
    return { segments, params };
  }

  function updateActiveNav(routeKey) {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      if (el.dataset.nav === routeKey) {
        el.setAttribute("aria-current", "page");
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }

  function renderRoute() {
    disconnectReelsObserver();
    stopHeroRotation();

    const { segments, params } = parseHash();
    const head = segments[0] || "home";

    document.body.classList.toggle("route-reels", head === "reels");
    topChrome.style.display = head === "series" ? "none" : "flex";

    if (head === "series" && segments[1]) {
      updateActiveNav("");
      renderSeriesDetailView(segments[1], params);
      return;
    }
    if (head === "reels") {
      updateActiveNav("reels");
      renderReelsView(params);
      return;
    }
    if (head === "pilots") {
      updateActiveNav("pilots");
      renderPilotsView();
      return;
    }
    if (head === "library") {
      updateActiveNav("library");
      renderLibraryView();
      return;
    }
    if (head === "search") {
      updateActiveNav("search");
      renderSearchView();
      return;
    }
    if (head === "creators") {
      updateActiveNav("creators");
      renderCreatorsView();
      return;
    }
    if (head === "studio") {
      updateActiveNav("");
      renderStudioView();
      return;
    }

    updateActiveNav("home");
    renderHomeView();
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "hero-dot") {
      heroIndex = Number(btn.dataset.index) || 0;
      const featured = Catalog.series.filter((s) => s.featured);
      updateHeroInPlace(featured);
      startHeroRotation(featured);
    } else if (action === "dismiss-launch-strip") {
      dismissLaunchStrip();
    } else if (action === "play-series") {
      const s = resolveSeries(btn.dataset.series);
      if (s) openSeriesPlayback(s);
    } else if (action === "play-episode") {
      const s = resolveSeries(btn.dataset.series);
      if (!s) return;
      const isAlt = btn.dataset.alt === "1";
      const ep = Catalog.getEpisode(s, btn.dataset.ep);
      const prog = Store.getProgress(s.id);
      const offset = !isAlt && prog && prog.episodeId === ep.id && !prog.completed ? prog.positionSec : 0;
      openEpisodePlayer(s, ep, isAlt, offset);
    } else if (action === "toggle-watchlist") {
      const added = await Store.toggleWatchlist(btn.dataset.series);
      showToast(added ? "Added to Library" : "Removed from Library");
      if (document.getElementById("hero-stage")) {
        const featured = Catalog.series.filter((s) => s.featured);
        updateHeroInPlace(featured);
      } else if (!playerSession.open) {
        renderRoute();
      }
    } else if (action === "toggle-vote") {
      const voted = await Store.togglePilotVote(btn.dataset.series);
      showToast(voted ? "Pilot Greenlight vote recorded" : "Vote removed");
      renderRoute();
    } else if (action === "detail-tab") {
      detailTab = btn.dataset.tab || "episodes";
      renderRoute();
    } else if (action === "ledger-mode") {
      detailLedgerMode = btn.dataset.mode || "actual";
      renderRoute();
    } else if (action === "toggle-synopsis") {
      synopsisExpanded = !synopsisExpanded;
      renderRoute();
    } else if (action === "go-back") {
      if (window.history.length > 1) window.history.back();
      else window.location.hash = "#/";
    } else if (action === "share-series") {
      const url = window.location.href;
      navigator.clipboard
        .writeText(url)
        .then(() => showToast("Series link copied to clipboard"))
        .catch(() => showToast(url));
    } else if (action === "copy-email") {
      navigator.clipboard
        .writeText("hello@mweshi.com")
        .then(() => showToast("Copied hello@mweshi.com"))
        .catch(() => showToast("hello@mweshi.com"));
    } else if (action === "toggle-reels-mute") {
      reelsMuted = !reelsMuted;
      document.querySelectorAll(".reel-video").forEach((v) => {
        v.muted = reelsMuted;
      });
      document.querySelectorAll("[data-mute-icon]").forEach((el) => {
        el.innerHTML = reelsMuted ? ICON_VOL_OFF : ICON_VOL_ON;
      });
      document.querySelectorAll("[data-mute-text]").forEach((el) => {
        el.textContent = reelsMuted ? "Muted" : "Sound";
      });
      showToast(reelsMuted ? "Reels muted" : "Reels sound on");
    } else if (action === "reel-step") {
      stepReel(Number(btn.dataset.step) || 1);
    } else if (action === "open-provenance-sheet") {
      const s = resolveSeries(btn.dataset.series);
      if (s) openProvenanceSheet(s);
    } else if (action === "open-cloud-sheet") {
      openCloudSyncSheet();
    } else if (action === "reset-progress") {
      await Store.clearProgress();
      showToast("Watch progress cleared");
      renderRoute();
    }
  });

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const next = Store.getTheme() === "petrol" ? "daylight" : "petrol";
      Store.setTheme(next);
      applyTheme(next);
      showToast(next === "petrol" ? "Midnight Petrol theme" : "Daylight Gallery theme");
    });
  }

  if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", () => sheet.close());
  if (sheet) {
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) sheet.close();
    });
  }

  /* Proposal #1: Cleanly close stuck modals and active video player on route change */
  window.addEventListener("hashchange", () => {
    if (sheet && sheet.open) sheet.close();
    if (playerSession.open) closePlayer(true);
    detailTab = "episodes";
    synopsisExpanded = false;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    renderRoute();
  });

  if (window.location.hash === "#creators") {
    window.location.replace("#/creators");
  }

  applyTheme(Store.getTheme());
  hydrateScreenerFromQuery();
  bindPlayerEvents();
  renderRoute();
})();
