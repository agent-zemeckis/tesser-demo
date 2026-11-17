/* Mweshi — Apple TV × Netflix Reels Streaming Application Controller
 *
 * Views & Routes:
 *   #/                 -> Apple TV Home Stage (Hero Showcase + Continue Watching 16:9 + 2:3 Posters + Reels Rail + Pilots)
 *   #/reels            -> Netflix-style 9:16 Vertical Scene Discovery Feed (IntersectionObserver auto-loop -> 1-tap Full Series)
 *   #/series/:slug     -> Apple TV Series Detail View (Inline-Progress Play Pill, Spec Strip, Episodes / Alt Timeline / Reels, Made With Ledger)
 *   #/pilots           -> Pilot Season Community Greenlight Slate
 *   #/library          -> Saved Watchlist & Continue Watching History
 *   #/search           -> Instant Search across titles, crew, genres, and provenance tags
 *   #/creators         -> Creator Terms, Submit Series / 15-Min Chat (saved locally, emailed to Victor), and Private TikTok DM Screener Builder
 *   ?screener=<token>  -> Hydrates an unlisted private creator screener into the Apple TV Series Detail & Player stage
 */

(function () {
  "use strict";

  const Catalog = window.TESSER_CATALOG;
  const Store = window.TesserStore;

  const root = document.getElementById("app-root");
  const topChrome = document.getElementById("top-chrome");
  const cloudBtn = document.getElementById("cloud-status-btn");
  const cloudDot = document.getElementById("cloud-status-dot");
  const cloudLabel = document.getElementById("cloud-status-label");
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
  const playerProvBtn = document.getElementById("player-provenance-btn");
  const playerElapsed = document.getElementById("player-elapsed");
  const playerScrubber = document.getElementById("player-scrubber");
  const playerRemaining = document.getElementById("player-remaining");
  const upnextEl = document.getElementById("player-upnext");
  const upnextSeriesTitle = document.getElementById("upnext-series-title");
  const upnextEpTitle = document.getElementById("upnext-ep-title");
  const upnextPlayBtn = document.getElementById("upnext-play-btn");
  const upnextBtnLabel = document.getElementById("upnext-btn-label");
  const upnextReplayBtn = document.getElementById("upnext-replay-btn");

  /* Ephemeral UI State */
  let heroIndex = 0;
  let heroTimer = null;
  let reelsObserver = null;
  let reelsMuted = true;
  let detailTab = "episodes";
  let detailLedgerMode = "actual"; // "actual" | "aispec"
  let synopsisExpanded = false;
  let searchQuery = "";
  let toastTimer = null;
  let activeScreenerSeries = null;

  /* Active Player Session */
  let playerSession = {
    open: false,
    series: null,
    episode: null,
    isAlternate: false,
    lastSavedAtMs: 0,
    idleTimer: null,
    endedReached: false
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
            `Private Apple TV-style series stage prepared by Mweshi to preview how "${data.title}" plays as an episodic show with sequential chapters and full Made With provenance.`
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
        youtubeId: idx === 0 ? ytId : ytId,
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
    const saved = Store.getState().screeners.find((s) => s.slug === slug);
    return saved || null;
  }

  /* ---------- Icons & Reusable HTML Builders ---------- */

  const ICON_PLAY = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
  const ICON_PAUSE = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
  const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17.5 19 6.5"/></svg>`;
  const ICON_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><polyline points="7 8 12 3 17 8"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`;
  const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
  const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

  /* Builds the Apple TV Solid White Play Pill — automatically turns into the
     Screenshot #4 Inline-Progress Resume Pill (`▶ ●━━── 2m left`) when progress exists! */
  function renderSmartPlayPill(series) {
    const prog = Store.getProgress(series.id);
    if (prog && !prog.completed && prog.positionSec > 3) {
      const pct = Math.min(96, Math.max(8, Math.round((prog.positionSec / Math.max(1, prog.durationSec)) * 100)));
      const remLabel = formatRemainingShort(Math.max(1, prog.durationSec - prog.positionSec));
      return `
        <button class="btn-play-white tabular" type="button" data-action="play-series" data-series="${esc(series.slug)}" aria-label="Resume ${esc(series.title)} Season ${prog.seasonNumber} Episode ${prog.episodeNumber}">
          ${ICON_PLAY}
          <span class="inline-progress-dot" aria-hidden="true"></span>
          <span class="inline-progress-track" aria-hidden="true">
            <span class="inline-progress-fill" style="width:${pct}%"></span>
          </span>
          <span>S${prog.seasonNumber}, E${prog.episodeNumber} &middot; ${esc(remLabel)}</span>
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

  function renderPosterCard(series) {
    return `
      <a class="card-2x3" href="#/series/${esc(series.slug)}" aria-label="${esc(series.title)} — ${series.episodes.length} episodes">
        <img src="${esc(series.poster)}" alt="${esc(series.title)} poster" loading="lazy">
        <div class="card-2x3-overlay">
          <span class="card-corner-brand">Mweshi</span>
          <span class="card-2x3-footer tabular">${series.episodes.length} Episodes &middot; ${esc(series.quality)}</span>
        </div>
      </a>
    `;
  }

  function renderContinueWatchingCard(prog) {
    const series = resolveSeries(prog.seriesId);
    if (!series) return "";
    const ep = Catalog.getEpisode(series, prog.episodeId) || series.episodes[0];
    const pct = Math.min(96, Math.max(6, Math.round((prog.positionSec / Math.max(1, prog.durationSec)) * 100)));
    const rem = formatRemainingShort(Math.max(1, prog.durationSec - prog.positionSec));
    return `
      <div class="card-16x9" role="group" aria-label="Continue watching ${esc(series.title)}">
        <img src="${esc(ep.thumb || series.heroImage)}" alt="${esc(series.title)} ${esc(ep.title)}" loading="lazy">
        <div class="card-16x9-scrim">
          <span class="card-corner-brand">Mweshi</span>
          <div>
            <div class="card-16x9-title">${esc(series.title)}</div>
            <div class="card-16x9-bottom tabular">
              <button type="button" class="cw-status" data-action="play-episode" data-series="${esc(series.slug)}" data-ep="${esc(ep.id)}" style="color:inherit;">
                <span style="display:inline-flex;width:0.85rem;height:0.85rem;">${ICON_PLAY}</span>
                <span class="cw-mini-bar"><span style="width:${pct}%"></span></span>
                <span>S${prog.seasonNumber}, E${prog.episodeNumber} &middot; ${esc(rem)}</span>
              </button>
              <a href="#/series/${esc(series.slug)}" aria-label="View ${esc(series.title)} details" style="padding:0.15rem 0.45rem;border-radius:99px;background:rgba(255,255,255,0.16);font-weight:600;">&middot;&middot;&middot;</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderFooter() {
    return `
      <footer class="app-footer">
        <div>
          <strong style="color:var(--ink);">Mweshi</strong> &middot; Serialized AI Cinema &middot; Demo footage courtesy of Blender Foundation Amsterdam (CC-BY, non-AI stand-in architecture demo).
        </div>
        <div class="app-footer-links">
          <a href="#/creators">For Creators &amp; Screener Studio</a>
          <a href="letter/">Founder's Letter</a>
          <a href="soul.md">For Agents (soul.md)</a>
          <a href="llms.txt">llms.txt</a>
          <button type="button" data-action="open-cloud-sheet">Saved on this browser</button>
        </div>
      </footer>
    `;
  }

  /* ---------- View 1: Apple TV Home Stage (`#/`) ---------- */

  function renderHomeView() {
    const featured = Catalog.series.filter((s) => s.featured);
    const activeHero = featured[heroIndex % featured.length] || featured[0];
    const inList = Store.isInWatchlist(activeHero.id);
    const cwList = Store.getContinueWatchingList();

    const cwSection = cwList.length
      ? `
        <section class="rail-section" aria-label="Continue Watching">
          <div class="rail-header">
            <h2 class="rail-title">Continue Watching <span class="rail-chevron">&rsaquo;</span></h2>
            <span class="rail-subtitle">Synced episode timestamps</span>
          </div>
          <div class="rail-scroller">
            ${cwList.map(renderContinueWatchingCard).join("")}
          </div>
        </section>
      `
      : "";

    const reelsPreviewRail = `
      <section class="rail-section" aria-label="Scene Reels Discovery">
        <div class="rail-header">
          <a href="#/reels" class="rail-title">Reels &middot; Vertical Scene Hooks <span class="rail-chevron">&rsaquo;</span></a>
          <span class="rail-subtitle">30-second hooks that open straight into Episode 1</span>
        </div>
        <div class="rail-scroller">
          ${Catalog.reels
            .map(
              (r) => `
            <a class="card-2x3" href="#/reels?reel=${esc(r.id)}" style="aspect-ratio:9/16;flex:0 0 clamp(9.5rem, 17vw, 13rem);">
              <img src="${esc(r.poster)}" alt="${esc(r.title)} scene hook" loading="lazy">
              <div class="card-2x3-overlay" style="background:linear-gradient(180deg,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0.88) 100%);">
                <span class="card-corner-brand">Reel</span>
                <div>
                  <div style="font-size:0.7rem;color:var(--provenance);font-weight:600;margin-bottom:0.15rem;">${esc(r.tag)}</div>
                  <div style="font-size:0.92rem;font-weight:600;color:#fff;margin-bottom:0.2rem;">${esc(r.title)}</div>
                  <div style="font-size:0.72rem;color:var(--ink-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(r.hook)}</div>
                </div>
              </div>
            </a>
          `
            )
            .join("")}
        </div>
      </section>
    `;

    const premiereRail = `
      <section class="rail-section" aria-label="Premiere Demo Slate">
        <div class="rail-header">
          <h2 class="rail-title">Premiere Demo Slate <span class="rail-chevron">&rsaquo;</span></h2>
          <span class="rail-subtitle">Dutch Blender Institute open films structured into serialized seasons</span>
        </div>
        <div class="rail-scroller">
          ${Catalog.series.map(renderPosterCard).join("")}
        </div>
      </section>
    `;

    const pilotSeries = Catalog.series.filter((s) => s.pilot && s.pilot.enabled);
    const pilotRail = `
      <section class="rail-section" aria-label="Pilot Season Community Greenlight">
        <div class="rail-header">
          <a href="#/pilots" class="rail-title">Pilot Season &middot; Greenlight <span class="rail-chevron">&rsaquo;</span></a>
          <span class="rail-subtitle">Audience demand signals which pilots earn full season backing</span>
        </div>
        <div class="rail-scroller">
          ${pilotSeries.map(renderPilotCard).join("")}
        </div>
      </section>
    `;

    const altRail = `
      <section class="rail-section" aria-label="Alternate Timelines">
        <div class="rail-header">
          <h2 class="rail-title">Alternate Timelines &amp; Cuts <span class="rail-chevron">&rsaquo;</span></h2>
          <span class="rail-subtitle">Parallel narrative cuts mounted alongside Season 1</span>
        </div>
        <div class="rail-scroller">
          ${Catalog.series
            .filter((s) => s.alternateEpisodes && s.alternateEpisodes.length)
            .map((s) => {
              const alt = s.alternateEpisodes[0];
              return `
                <a class="card-16x9" href="#/series/${esc(s.slug)}?tab=alt">
                  <img src="${esc(alt.thumb)}" alt="${esc(alt.title)}" loading="lazy">
                  <div class="card-16x9-scrim">
                    <span class="card-corner-brand">${esc(alt.branchLabel || "Alternate Cut")}</span>
                    <div>
                      <div class="card-16x9-title">${esc(s.title)}</div>
                      <div class="card-16x9-bottom">
                        <span>${esc(alt.title)}</span>
                        <span class="tabular">${formatDurationHuman(alt.durationSec)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    root.innerHTML = `
      <section class="hero-stage" aria-label="Featured series showcase" id="hero-stage">
        <img class="hero-backdrop" src="${esc(activeHero.heroImage)}" alt="${esc(activeHero.title)} key art">
        <div class="hero-scrim"></div>
        <div class="hero-content">
          <span class="hero-eyebrow-pill">${esc(activeHero.eyebrow)}</span>
          <h1 class="hero-wordmark" data-style="${esc(activeHero.wordmarkStyle)}">
            <a href="#/series/${esc(activeHero.slug)}">${esc(activeHero.title)}</a>
          </h1>
          <p class="hero-meta-line">
            <span class="tesser-mini-badge">Mweshi</span>
            <span>&middot;</span>
            <span>${esc(activeHero.category)}</span>
          </p>
          <p class="hero-subline">${esc(activeHero.subline)}</p>

          <div class="hero-cta-row">
            ${renderSmartPlayPill(activeHero)}
            <button class="btn-circle-glass" type="button" data-action="toggle-watchlist" data-series="${esc(activeHero.id)}" aria-pressed="${inList}" aria-label="${inList ? "Remove from Library" : "Add to Library"}" title="${inList ? "In Library" : "Add to Library"}">
              ${inList ? ICON_CHECK : ICON_PLUS}
            </button>
            <a class="btn-circle-glass" href="#/series/${esc(activeHero.slug)}" aria-label="Open ${esc(activeHero.title)} series page" title="Episodes &amp; Made With Ledger">
              ${ICON_INFO}
            </a>
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

      <div class="rails-container">
        ${cwSection}
        ${premiereRail}
        ${reelsPreviewRail}
        ${pilotRail}
        ${altRail}
      </div>
      ${renderFooter()}
    `;

    startHeroRotation(featured.length);
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
          <h3 style="margin:0;font-size:1.05rem;font-weight:var(--w-semibold);">
            <a href="#/series/${esc(series.slug)}">${esc(series.title)}</a>
          </h3>
          <p style="margin:0;font-size:var(--text-xs);color:var(--ink-secondary);line-height:1.45;">${esc(series.pilot.pitch)}</p>
          <div class="pilot-actions">
            <button class="btn-vote" type="button" data-action="toggle-vote" data-series="${esc(series.id)}" aria-pressed="${voted}">
              <span>${voted ? "✓ Greenlight Vote Recorded" : "▲ Vote to Greenlight"}</span>
            </button>
            <button class="glass-chip" type="button" data-action="play-series" data-series="${esc(series.slug)}">Watch Ep 1</button>
          </div>
        </div>
      </article>
    `;
  }

  function startHeroRotation(count) {
    clearInterval(heroTimer);
    if (count <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroTimer = setInterval(() => {
      const stage = document.getElementById("hero-stage");
      if (!stage || stage.matches(":hover")) return;
      heroIndex = (heroIndex + 1) % count;
      renderHomeView();
    }, 9000);
  }

  /* ---------- View 2: Apple TV Series Detail View (`#/series/:slug`) ---------- */

  function renderSeriesDetailView(slug, queryParams) {
    clearInterval(heroTimer);
    const series = resolveSeries(slug);
    if (!series) {
      root.innerHTML = `
        <div class="page-shell">
          <h1 class="page-title">Series not found</h1>
          <p class="page-lede">That title isn't in the active demo catalogue.</p>
          <a class="btn-play-white" href="#/">Back to Home</a>
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
                  <p class="ep-card-eyebrow">${esc(r.tag)} &middot; Vertical 9:16 Hook</p>
                  <h3 class="ep-card-title">Open in Reels Feed</h3>
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

    root.innerHTML = `
      <div class="detail-view">
        <div class="detail-top-bar">
          <button class="glass-icon-btn" type="button" data-action="go-back" aria-label="Back">
            ${ICON_BACK}
          </button>
          <div class="detail-pill-group">
            <button class="glass-icon-btn" type="button" style="width:2.25rem;height:2.25rem;border:0;background:transparent;" data-action="toggle-watchlist" data-series="${esc(series.id)}" aria-pressed="${inList}" aria-label="${inList ? "Remove from Library" : "Add to Library"}">
              ${inList ? ICON_CHECK : ICON_PLUS}
            </button>
            <button class="glass-icon-btn" type="button" style="width:2.25rem;height:2.25rem;border:0;background:transparent;" data-action="share-series" data-title="${esc(series.title)}" aria-label="Copy series link">
              ${ICON_SHARE}
            </button>
          </div>
        </div>

        <section class="detail-hero">
          <img class="detail-hero-img" src="${esc(series.heroImage)}" alt="${esc(series.title)} backdrop">
          <div class="hero-scrim"></div>
          <div class="detail-hero-inner">
            <span class="hero-eyebrow-pill">${esc(series.eyebrow)}</span>
            <h1 class="hero-wordmark" data-style="${esc(series.wordmarkStyle)}">${esc(series.title)}</h1>
            <p class="hero-meta-line" style="margin-bottom:1.1rem;">
              <span class="tesser-mini-badge">Mweshi</span>
              <span>&middot;</span>
              <span>${esc(series.category)}</span>
            </p>
            <div class="hero-cta-row" style="margin-bottom:0.5rem;">
              ${renderSmartPlayPill(series)}
              <button class="btn-circle-glass" type="button" data-action="toggle-watchlist" data-series="${esc(series.id)}" aria-pressed="${inList}" aria-label="Toggle Library">
                ${inList ? ICON_CHECK : ICON_PLUS}
              </button>
              ${
                series.pilot && series.pilot.enabled
                  ? `<button class="btn-vote" style="height:2.95rem;padding:0 1.05rem;" type="button" data-action="toggle-vote" data-series="${esc(series.id)}" aria-pressed="${Store.hasVotedPilot(series.id)}">
                      ${Store.hasVotedPilot(series.id) ? "✓ Voted" : "▲ Greenlight"}
                    </button>`
                  : ""
              }
            </div>
          </div>
        </section>

        <section class="detail-synopsis-wrap">
          <p class="detail-synopsis ${synopsisExpanded ? "" : "clamped"}">
            ${esc(series.synopsis)} ${synopsisExpanded && series.synopsisExtended ? esc(series.synopsisExtended) : ""}
          </p>
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;">
            <div class="spec-strip tabular">
              <span>${series.year}</span>
              <span>&middot;</span>
              <span>${series.episodes.length} Episodes (${esc(series.totalRuntimeLabel)})</span>
              ${(series.badges || [])
                .map(
                  (b) =>
                    `<span class="spec-badge ${b.includes("C2PA") || b === "PILOT" || b === "UNLISTED" ? "spec-badge--gold" : ""}">${esc(b)}</span>`
                )
                .join("")}
            </div>
            <button class="more-pill" type="button" data-action="toggle-synopsis">
              ${synopsisExpanded ? "LESS" : "MORE"}
            </button>
          </div>
        </section>

        <div class="detail-body">
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

          ${activeTabContent}

          <!-- Apple TV "How to Watch" Box (Screenshot #2) -->
          <div class="how-to-watch-box">
            <div class="htw-left">
              <div class="htw-app-icon"><span style="color:var(--provenance);">●</span>&nbsp;T</div>
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--w-semibold);">
                  ${series.isUnlistedScreener ? "Private Unlisted Creator Screener" : "Stream on Mweshi · Open Architecture Demo"}
                </div>
                <div style="font-size:var(--text-xs);color:var(--ink-muted);">
                  ${
                    series.isUnlistedScreener
                      ? "Prepared solely for creator preview. Zero rights claimed without your sign-off."
                      : "Sequential episodes, saved inline resume timestamps, and full Made With provenance."
                  }
                </div>
              </div>
            </div>
            ${
              series.isUnlistedScreener
                ? `<a class="btn-play-white" style="height:2.4rem;min-width:auto;padding:0 1rem;font-size:var(--text-xs);" href="#/creators">Reply / Claim Series</a>`
                : `<button class="glass-chip" type="button" data-action="play-series" data-series="${esc(series.slug)}">Play Now</button>`
            }
          </div>

          <!-- Mweshi's Signature "Made With & Provenance" Ledger (Screenshots #2 & #3 Typography) -->
          <section class="ledger-section" aria-labelledby="ledger-madewith">
            <div class="ledger-head">
              <h2 class="ledger-title" id="ledger-madewith">Made With &amp; Provenance</h2>
              <div class="seg-tabs" style="margin-bottom:0;">
                <button class="seg-tab" type="button" aria-selected="${detailLedgerMode === "actual"}" data-action="ledger-mode" data-mode="actual">
                  Actual Demo Credits
                </button>
                <button class="seg-tab" type="button" aria-selected="${detailLedgerMode === "aispec"}" data-action="ledger-mode" data-mode="aispec">
                  AI Series Spec Preview
                </button>
              </div>
            </div>

            <p style="margin:0 0 1.15rem;padding:0.75rem 0.95rem;border-radius:var(--r-sm);background:var(--surface-1);border-left:2px solid var(--provenance);font-size:var(--text-xs);color:var(--ink-secondary);line-height:1.5;">
              ${
                detailLedgerMode === "aispec"
                  ? "Previewing Mweshi's native AI Series Provenance Schema: every AI-made show on Mweshi credits both the human filmmakers (writing, voice, editorial hours) and the exact generative models used."
                  : esc(series.madeWith.demoNotice)
              }
            </p>

            <dl class="ledger-dl">
              ${ledgerRows
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
          </section>

          <!-- Apple TV "Information" Ledger (Screenshot #3) -->
          <section class="ledger-section" aria-labelledby="ledger-info">
            <div class="ledger-head">
              <h2 class="ledger-title" id="ledger-info">Information</h2>
            </div>
            <dl class="ledger-dl">
              <div class="ledger-item"><dt>Studio</dt><dd>${esc(series.studio)}</dd></div>
              <div class="ledger-item"><dt>Released</dt><dd class="tabular">${series.year}</dd></div>
              <div class="ledger-item"><dt>Run Time</dt><dd class="tabular">${series.episodes.length} Episodes (${esc(series.totalRuntimeLabel)})</dd></div>
              <div class="ledger-item"><dt>Rated</dt><dd>${esc(series.rating)}</dd></div>
              <div class="ledger-item"><dt>Region of Origin</dt><dd>${esc(series.region)}</dd></div>
            </dl>
          </section>

          <!-- Apple TV "Languages" Ledger (Screenshot #3) -->
          <section class="ledger-section" aria-labelledby="ledger-lang">
            <div class="ledger-head">
              <h2 class="ledger-title" id="ledger-lang">Languages</h2>
            </div>
            <dl class="ledger-dl">
              <div class="ledger-item"><dt>Original Audio</dt><dd>${esc(series.languages.originalAudio)}</dd></div>
              <div class="ledger-item"><dt>Audio</dt><dd>${esc(series.languages.audio)}</dd></div>
              <div class="ledger-item"><dt>Subtitles</dt><dd>${esc(series.languages.subtitles)}</dd></div>
            </dl>
          </section>

          <!-- Apple TV "Accessibility" Ledger (Screenshot #3) -->
          <section class="ledger-section" aria-labelledby="ledger-a11y">
            <div class="ledger-head">
              <h2 class="ledger-title" id="ledger-a11y">Accessibility</h2>
            </div>
            <div class="a11y-block">
              <span class="spec-badge">SDH</span>
              <p>Subtitles for the Deaf and Hard-of-Hearing (SDH) refer to subtitles in the original language with the addition of relevant non-dialogue information.</p>
            </div>
            <div class="a11y-block">
              <span class="spec-badge">AD</span>
              <p>Audio descriptions (AD) refer to a narration track describing what is happening on screen, to provide context for those who are blind or have low vision.</p>
            </div>
          </section>
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

    return `
      <button class="ep-card" type="button" data-action="play-episode" data-series="${esc(series.slug)}" data-ep="${esc(ep.id)}" data-alt="${isAlt ? "1" : "0"}">
        <div class="ep-card-thumb">
          <img src="${esc(ep.thumb)}" alt="Episode ${ep.number}: ${esc(ep.title)}" loading="lazy">
          ${pct > 0 ? `<div class="ep-card-progress"><span style="width:${pct}%"></span></div>` : ""}
        </div>
        <div class="ep-card-info">
          <p class="ep-card-eyebrow tabular">
            ${isAlt ? esc(ep.branchLabel || "Alternate Cut") : `S${ep.season}, E${ep.number}`} &middot; ${formatDurationHuman(ep.durationSec)}
          </p>
          <h3 class="ep-card-title">${esc(ep.title)}</h3>
          <p class="ep-card-desc">${esc(ep.synopsis)}</p>
        </div>
      </button>
    `;
  }

  /* ---------- View 3: Netflix-Style Vertical 9:16 Reels Feed (`#/reels`) ---------- */

  function renderReelsView(queryParams) {
    clearInterval(heroTimer);
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

    root.innerHTML = `
      <section class="reels-stage" id="reels-stage" aria-label="Vertical Scene Reels Discovery">
        ${orderedReels
          .map((reel, idx) => {
            const series = Catalog.getSeriesBySlug(reel.seriesId);
            const inList = series ? Store.isInWatchlist(series.id) : false;
            const mediaSrc = `${reel.streamUrl}#t=${reel.startSec},${reel.endSec}`;
            return `
              <article class="reel-slide" data-reel-id="${esc(reel.id)}" data-start="${reel.startSec}" data-end="${reel.endSec}">
                <div class="reel-frame">
                  <video class="reel-video" playsinline preload="${idx === 0 ? "auto" : "none"}" poster="${esc(reel.poster)}" ${reelsMuted ? "muted" : ""} data-src="${esc(mediaSrc)}" ${idx === 0 ? `src="${esc(mediaSrc)}"` : ""}></video>
                  <div class="reel-scrim"></div>
                  <div class="reel-overlay">
                    <div class="reel-info">
                      <div class="reel-tag">
                        <span class="tesser-mini-badge">Mweshi</span>
                        <span>&middot;</span>
                        <span>${esc(reel.tag)}</span>
                      </div>
                      <h2 class="reel-title">${esc(reel.title)}</h2>
                      <p class="reel-hook">${esc(reel.hook)}</p>
                      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
                        <button class="btn-play-white" style="height:2.6rem;min-width:auto;padding:0 1.15rem;font-size:var(--text-sm);" type="button" data-action="play-episode" data-series="${esc(reel.seriesId)}" data-ep="${esc(reel.episodeId)}">
                          ${ICON_PLAY}
                          <span>Watch Full Episode</span>
                        </button>
                        <a class="glass-chip" style="height:2.6rem;padding:0 0.95rem;" href="#/series/${esc(reel.seriesId)}">
                          All Episodes
                        </a>
                      </div>
                    </div>

                    <div class="reel-rail-actions">
                      <button class="glass-icon-btn" type="button" data-action="toggle-reels-mute" aria-label="Toggle sound">
                        <span data-mute-label style="font-size:0.7rem;font-weight:600;">${reelsMuted ? "MUTE" : "SOUND"}</span>
                      </button>
                      <span class="reel-action-label">${reelsMuted ? "Tap Sound" : "Live"}</span>

                      <button class="glass-icon-btn" type="button" data-action="toggle-watchlist" data-series="${esc(reel.seriesId)}" aria-pressed="${inList}" aria-label="Save series">
                        ${inList ? ICON_CHECK : ICON_PLUS}
                      </button>
                      <span class="reel-action-label">${inList ? "Saved" : "My List"}</span>

                      <button class="glass-icon-btn" type="button" data-action="open-provenance-sheet" data-series="${esc(reel.seriesId)}" aria-label="Made With Provenance">
                        ${ICON_INFO}
                      </button>
                      <span class="reel-action-label">Made With</span>
                    </div>
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

  function setupReelsObserver() {
    const slides = document.querySelectorAll(".reel-slide");
    if (!slides.length) return;

    slides.forEach((slide) => {
      const vid = slide.querySelector("video");
      const start = Number(slide.dataset.start) || 0;
      const end = Number(slide.dataset.end) || start + 30;
      if (!vid) return;

      vid.addEventListener("loadedmetadata", () => {
        if (vid.currentTime < start || vid.currentTime >= end) {
          vid.currentTime = start;
        }
      });

      vid.addEventListener("timeupdate", () => {
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
    clearInterval(heroTimer);
    const pilots = Catalog.series.filter((s) => s.pilot && s.pilot.enabled);
    root.innerHTML = `
      <div class="page-shell">
        <span class="hero-eyebrow-pill">Audience Greenlight Program</span>
        <h1 class="page-title">Pilot Season</h1>
        <p class="page-lede">
          Great AI storytellers shouldn't have to guess whether Episode 2 is worth sixty hours of generation and editing. Creators premiere Pilot Episode 1 here; viewers watch and cast 1-per-account greenlight votes to fund full seasons.
        </p>

        <div class="creator-grid" style="margin-bottom:2.5rem;">
          ${pilots.map(renderPilotCard).join("")}
        </div>

        <div class="glass-panel">
          <h2>Making a serialized AI pilot?</h2>
          <p style="color:var(--ink-secondary);font-size:var(--text-sm);max-width:42rem;margin:0 0 1rem;">
            Keep 100% of your IP, keep posting short vertical hooks on TikTok, Reels, and YouTube Shorts, and make Mweshi the home where viewers binge full episodes in sequence.
          </p>
          <a class="btn-play-white" style="height:2.65rem;font-size:var(--text-sm);" href="#/creators">Submit a Pilot or Preview Screener</a>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  /* ---------- View 5: Library (`#/library`) ---------- */

  function renderLibraryView() {
    clearInterval(heroTimer);
    const st = Store.getState();
    const savedSeries = st.watchlist.map(resolveSeries).filter(Boolean);
    const cwList = Store.getContinueWatchingList();

    root.innerHTML = `
      <div class="page-shell">
        <div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:1rem;">
          <div>
            <h1 class="page-title">Library</h1>
            <p class="page-lede">Your saved Watchlist, Continue Watching timestamps, and private creator screeners.</p>
          </div>
          <button class="glass-chip" type="button" data-action="reset-progress">Reset Demo Progress</button>
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

        ${
          st.screeners.length
            ? `
          <h2 class="rail-title" style="margin:0 0 0.9rem;">Generated TikTok / Creator Screeners</h2>
          <div class="creator-grid">
            ${st.screeners
              .map(
                (sc) => `
              <div class="glass-panel">
                <div style="font-size:var(--text-xs);color:var(--provenance);margin-bottom:0.25rem;">Unlisted Screener</div>
                <h3 style="margin:0 0 0.35rem;">${esc(sc.title)}</h3>
                <p style="margin:0 0 0.85rem;font-size:var(--text-xs);color:var(--ink-muted);">Prepared for ${esc(sc.creator)}</p>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                  <a class="glass-chip" href="${esc(sc.url)}">Open Screener</a>
                </div>
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
  }

  /* ---------- View 6: Search (`#/search`) ---------- */

  function renderSearchView() {
    clearInterval(heroTimer);
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
        <p class="page-lede">Search series, episode titles, Amsterdam crew credits, or genres.</p>

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

  /* ---------- View 7: For Creators & TikTok DM Screener Builder (`#/creators`) ---------- */

  function renderCreatorsView() {
    clearInterval(heroTimer);
    root.innerHTML = `
      <div class="page-shell">
        <span class="hero-eyebrow-pill">Founding Cohort &middot; Co-Written Terms</span>
        <h1 class="page-title">A cinema home for serialized AI storytellers.</h1>
        <p class="page-lede">
          Short-form feeds reward five-second hooks, then bury Episode 3 behind unrelated clips. Mweshi gives your world an Apple TV-grade series page: seasons in sequence, vertical Reels that funnel straight into Episode 1, and transparent provenance.
        </p>

        <div class="creator-grid" style="margin-bottom:2rem;">
          <section class="glass-panel">
            <h2>Founding Creator Terms</h2>
            <ul class="clean-list">
              <li><strong>100% Creator-Owned IP</strong> &mdash; You keep your characters, world, and adaptation rights. Always.</li>
              <li><strong>Non-Exclusive Social Funnel</strong> &mdash; Keep posting vertical hooks on TikTok, Reels, X, and YouTube Shorts to drive viewers into your full series.</li>
              <li><strong>Co-Written Founding Terms</strong> &mdash; Revenue share, compute support, and premiere windows are being shaped directly with our first cohort rather than handed down.</li>
              <li><strong>Honest Made-With Ledger</strong> &mdash; Every title credits your human writing, voice cast, editorial hours, and generative stack openly.</li>
            </ul>
            <div style="margin-top:1.15rem;display:flex;gap:0.65rem;flex-wrap:wrap;">
              <a class="glass-chip" href="letter/">Read Victor's Founder Letter &rarr;</a>
              <span class="glass-chip">Reply in the Facebook chat that sent you here</span>
            </div>
          </section>

          <!-- Submit Pilot / Book 15-Min Founder Chat (copied for the Facebook reply) -->
          <section class="glass-panel">
            <h2>Submit a Pilot or Book 15 Mins</h2>
            <form class="form-stack" id="creator-pitch-form">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <label>Your Name or Studio *
                  <input type="text" name="creatorName" required maxlength="120" placeholder="e.g. Studio Kora">
                </label>
                <label>Email *
                  <input type="email" name="email" required maxlength="200" placeholder="you@domain.com">
                </label>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
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
                <input type="text" name="toolsUsed" maxlength="400" placeholder="e.g. Kling 2.0, Runway, DaVinci Resolve, human voice cast">
              </label>
              <label>Notes or Preferred 15-Min Chat Window
                <textarea name="notes" maxlength="1500" placeholder="Tell Victor about your series arc, episode count, or what terms would make Mweshi worth your time."></textarea>
              </label>
              <button class="btn-play-white" type="submit" style="width:100%;">Send to Founding Slate</button>
            </form>
          </section>
        </div>

        <!-- Private TikTok / YouTube DM Screener Link Generator -->
        <section class="glass-panel" style="border-color:rgba(217,160,91,0.35);">
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.4rem;">
            <h2 style="margin:0;">Private Creator Screener Builder (For TikTok &amp; YouTube DMs)</h2>
            <span class="spec-badge spec-badge--gold">UNLISTED LINK GENERATOR</span>
          </div>
          <p style="font-size:var(--text-sm);color:var(--ink-secondary);max-width:52rem;margin:0 0 1.15rem;">
            Spotted a serialized AI creator on TikTok or YouTube? Paste their handle, series title, and a public YouTube link (or direct MP4) below to generate an <strong>unlisted Apple TV-style series preview URL</strong> you can send in a DM&mdash;clearly labeled as a private preview with zero public claim.
          </p>

          <form class="form-stack" id="screener-builder-form">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:0.75rem;">
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
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:0.75rem;">
              <label>YouTube URL / ID or Direct .mp4 URL *
                <input type="text" name="video" required placeholder="https://www.youtube.com/watch?v=... or .mp4 URL">
              </label>
              <label>Episode Titles (comma-separated)
                <input type="text" name="episodes" placeholder="Episode 1: The Signal, Episode 2: Blackout, Episode 3: Protocol">
              </label>
            </div>
            <label>Short Synopsis / DM Personalization Note
              <input type="text" name="synopsis" maxlength="320" placeholder="Optional 1-2 sentence logline for their preview hero...">
            </label>
            <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">
              <button class="btn-play-white" type="submit" style="height:2.7rem;font-size:var(--text-sm);">Generate Unlisted Screener Link</button>
            </div>
          </form>

          <div id="screener-output" hidden style="margin-top:1.15rem;padding:1rem;border-radius:var(--r-sm);background:var(--bg-elevated);border:0.5px solid var(--hairline-strong);"></div>
        </section>
      </div>
      ${renderFooter()}
    `;

    bindCreatorForms();
  }

  function bindCreatorForms() {
    const pitchForm = document.getElementById("creator-pitch-form");
    if (pitchForm) {
      pitchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(pitchForm);
        const payload = {
          creatorName: fd.get("creatorName"),
          email: fd.get("email"),
          seriesTitle: fd.get("seriesTitle"),
          channelUrl: fd.get("channelUrl"),
          pilotUrl: fd.get("pilotUrl"),
          toolsUsed: fd.get("toolsUsed"),
          notes: fd.get("notes"),
          preferredTime: ""
        };
        await Store.submitCreatorPitch(payload);
        const reply = [
          `Creator: ${payload.creatorName}`,
          `Email: ${payload.email}`,
          `Channel: ${payload.channelUrl}`,
          `Pilot Link: ${payload.pilotUrl}`,
          `Tools: ${payload.toolsUsed}`,
          "",
          "Notes:",
          payload.notes
        ].join("\n");
        pitchForm.reset();
        try {
          await navigator.clipboard.writeText(reply);
          showToast("Copied. Paste it into your Facebook chat with Victor.");
        } catch (_) {
          showToast("Reply to Victor on Facebook with your series link. This page does not email anyone.");
        }
      });
    }

    const scrForm = document.getElementById("screener-builder-form");
    const scrOut = document.getElementById("screener-output");
    if (scrForm && scrOut) {
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

        const dmCopy = `Hey ${spec.creator} — been watching "${spec.title}" and loved the worldbuilding. I'm building Mweshi (an Apple TV-style home strictly for serialized AI shows so episodes play in order instead of getting buried in short-form feeds). Put together a private unlisted preview of how "${spec.title}" looks on a cinema stage: ${fullUrl} — zero claim on your work, just wanted to show you and get your take if you have 2 mins.`;

        Store.saveLocalScreener({
          slug: `screener-${Date.now()}`,
          creator: spec.creator,
          title: spec.title,
          url: fullUrl
        });

        scrOut.hidden = false;
        scrOut.innerHTML = `
          <div style="font-size:var(--text-xs);color:var(--provenance);font-weight:600;margin-bottom:0.4rem;">Private Screener Ready</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.85rem;">
            <input type="text" readonly value="${esc(fullUrl)}" style="flex:1;min-width:14rem;padding:0.55rem 0.75rem;border-radius:8px;background:var(--surface-1);border:0.5px solid var(--hairline);color:var(--ink);font-size:var(--text-xs);">
            <button class="glass-chip" type="button" id="copy-screener-url">Copy URL</button>
            <a class="btn-play-white" style="height:2.35rem;min-width:auto;padding:0 1rem;font-size:var(--text-xs);" href="${esc(fullUrl)}">Preview Stage</a>
          </div>
          <div style="font-size:var(--text-xs);color:var(--ink-muted);margin-bottom:0.3rem;">Ready-to-paste TikTok / Instagram / X DM:</div>
          <textarea readonly style="width:100%;min-height:4.6rem;padding:0.65rem;border-radius:8px;background:var(--surface-1);border:0.5px solid var(--hairline);color:var(--ink-secondary);font-size:var(--text-xs);">${esc(dmCopy)}</textarea>
          <button class="glass-chip" type="button" id="copy-screener-dm" style="margin-top:0.5rem;">Copy DM Script</button>
        `;

        document.getElementById("copy-screener-url").onclick = () => {
          navigator.clipboard.writeText(fullUrl).then(() => showToast("Screener link copied"));
        };
        document.getElementById("copy-screener-dm").onclick = () => {
          navigator.clipboard.writeText(dmCopy).then(() => showToast("TikTok DM message copied"));
        };
      });
    }
  }

  /* ---------- Edge-to-Edge Apple TV Cinema Player ---------- */

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
    clearInterval(heroTimer);

    playerSession.open = true;
    playerSession.series = series;
    playerSession.episode = episode;
    playerSession.isAlternate = Boolean(isAlternate);
    playerSession.endedReached = false;

    playerModal.hidden = false;
    upnextEl.hidden = true;
    document.body.style.overflow = "hidden";

    playerSeriesLabel.textContent = series.title;
    playerEpLabel.textContent = isAlternate
      ? `${episode.branchLabel || "Alternate Cut"} · ${episode.title}`
      : `S${episode.season}, E${episode.number} · ${episode.title}`;

    /* Check if this is a YouTube-backed Unlisted Creator Screener */
    if (episode.youtubeId) {
      videoEl.pause();
      videoEl.hidden = true;
      iframeEl.hidden = false;
      playerBottomChrome.hidden = true;
      playerTestEndBtn.hidden = true;
      iframeEl.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.youtubeId)}?autoplay=1&rel=0&modestbranding=1`;
      return;
    }

    iframeEl.hidden = true;
    iframeEl.src = "";
    videoEl.hidden = false;
    playerBottomChrome.hidden = false;
    playerTestEndBtn.hidden = false;

    const targetStart = (episode.startSec || 0) + Math.max(0, Math.min((episode.durationSec || 180) - 4, Number(resumeOffsetSec) || 0));

    const startPlayback = () => {
      try {
        videoEl.currentTime = targetStart;
      } catch (_) {}
      videoEl.play().catch(() => {});
      updatePlayerScrubberUI();
    };

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
    playerMuteBtn.textContent = videoEl.muted ? "Muted" : "Sound On";
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

  function closePlayer() {
    if (!playerSession.open) return;
    persistCurrentPlayerProgress(false);
    videoEl.pause();
    iframeEl.src = "";
    playerSession.open = false;
    playerModal.hidden = true;
    upnextEl.hidden = true;
    document.body.style.overflow = "";
    clearTimeout(playerSession.idleTimer);
    renderRoute();
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
    videoEl.addEventListener("timeupdate", () => {
      if (!playerSession.open || !playerSession.episode) return;
      const ep = playerSession.episode;
      updatePlayerScrubberUI();

      const now = Date.now();
      if (now - playerSession.lastSavedAtMs > 3000 && !videoEl.paused) {
        playerSession.lastSavedAtMs = now;
        persistCurrentPlayerProgress(false);
      }

      /* Reveal Apple TV Screenshot #1 Bottom-Left "Next Episode" Overlay in final 5 seconds */
      if (videoEl.currentTime >= ep.endSec - 5 && upnextEl.hidden) {
        showUpNextOverlay();
      }

      /* Cleanly stop at virtual episode end boundary so chapters behave like distinct episodes */
      if (videoEl.currentTime >= ep.endSec && !playerSession.endedReached) {
        playerSession.endedReached = true;
        videoEl.pause();
        const nextEp = getNextSequentialEpisode(playerSession.series, ep, playerSession.isAlternate);
        if (nextEp) {
          /* Pre-queue next episode at 0s in Continue Watching! */
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
      playerAspectBtn.textContent = next === "cinema" ? "Cinema 16:9" : "Feed 9:16";
    });

    playerTestEndBtn.addEventListener("click", () => {
      if (!playerSession.episode) return;
      playerSession.endedReached = false;
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

    upnextPlayBtn.addEventListener("click", () => {
      const { series, episode, isAlternate } = playerSession;
      const nextEp = getNextSequentialEpisode(series, episode, isAlternate);
      if (nextEp) {
        openEpisodePlayer(series, nextEp, false, 0);
      } else {
        closePlayer();
      }
    });

    upnextReplayBtn.addEventListener("click", () => {
      if (!playerSession.series || !playerSession.episode) return;
      openEpisodePlayer(playerSession.series, playerSession.episode, playerSession.isAlternate, 0);
    });

    playerCloseBtn.addEventListener("click", closePlayer);
    playerModal.addEventListener("mousemove", bumpPlayerIdleTimer);
    playerModal.addEventListener("touchstart", bumpPlayerIdleTimer, { passive: true });

    window.addEventListener("keydown", (e) => {
      if (!playerSession.open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closePlayer();
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
      }
    });
  }

  /* ---------- Apple Sheet Modals (Provenance Quick Sheet & local save note) ---------- */

  function openProvenanceSheet(series) {
    if (!series || !sheet) return;
    sheetTitle.textContent = `${series.title} · Made With`;
    sheetBody.innerHTML = `
      <p style="margin:0 0 1rem;font-size:var(--text-xs);color:var(--ink-secondary);line-height:1.5;padding:0.7rem;border-radius:8px;background:var(--bg-elevated);border-left:2px solid var(--provenance);">
        ${esc(series.madeWith.demoNotice)}
      </p>
      <dl class="ledger-dl" style="grid-template-columns:1fr;">
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
      <p style="margin:0 0 0.85rem;font-size:var(--text-sm);color:var(--ink-secondary);line-height:1.5;">
        Continue Watching, your watchlist, pilot votes, and screener links stay in this browser.
      </p>
      <p style="margin:0;font-size:var(--text-xs);color:var(--ink-muted);line-height:1.5;">
        Clearing site data for this page removes that history. A creator pitch also opens an email draft so it can reach Victor.
      </p>
    `;
    sheet.showModal();
  }

  function updateCloudStatusPill() {
    if (!cloudLabel || !cloudDot) return;
    cloudDot.style.background = "#d9a05b";
    cloudLabel.textContent = "On this browser";
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
    const { segments, params } = parseHash();
    const head = segments[0] || "home";

    /* Hide top global chrome on Detail view since Detail renders its own sticky `<` and `↑` glass bar */
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

    updateActiveNav("home");
    renderHomeView();
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "hero-dot") {
      heroIndex = Number(btn.dataset.index) || 0;
      renderHomeView();
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
      if (!playerSession.open) renderRoute();
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
    } else if (action === "toggle-reels-mute") {
      reelsMuted = !reelsMuted;
      document.querySelectorAll(".reel-video").forEach((v) => {
        v.muted = reelsMuted;
      });
      document.querySelectorAll("[data-mute-label]").forEach((el) => {
        el.textContent = reelsMuted ? "MUTE" : "SOUND";
      });
      showToast(reelsMuted ? "Reels muted" : "Reels sound enabled");
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

  if (cloudBtn) cloudBtn.addEventListener("click", openCloudSyncSheet);
  if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", () => sheet.close());
  if (sheet) {
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) sheet.close();
    });
  }

  window.addEventListener("hashchange", () => {
    detailTab = "episodes";
    synopsisExpanded = false;
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    renderRoute();
  });

  /* Support legacy #creators hash from older outreach emails */
  if (window.location.hash === "#creators") {
    window.location.replace("#/creators");
  }

  Store.subscribe(() => {
    updateCloudStatusPill();
  });

  hydrateScreenerFromQuery();
  bindPlayerEvents();
  updateCloudStatusPill();
  renderRoute();
})();
