/* Mweshi — Browser persistence
 *
 * Continue Watching, watchlist, pilot votes, theme preference, creator pitches,
 * and private screener links are saved in localStorage (`tesser.state.v2`).
 */

(function () {
  "use strict";

  const STORAGE_KEY = "tesser.state.v2";
  const listeners = new Set();

  function defaultState() {
    return {
      seededDemo: true,
      theme: "daylight", // "daylight" (Theme B) | "petrol" (Theme C)
      /* Seeded half-watched episode on first load so the Continue Watching
         rail and inline-progress Play pill are immediately demonstrable. */
      progress: {
        "tears-of-steel": {
          seriesId: "tears-of-steel",
          episodeId: "tos-s1e2",
          episodeNumber: 2,
          seasonNumber: 1,
          positionSec: 68,
          durationSec: 180,
          completed: false,
          updatedAtMs: Date.now() - 1000 * 60 * 18
        }
      },
      watchlist: ["tears-of-steel", "cosmos-laundromat"],
      pilotVotes: {},
      screeners: [],
      submissions: []
    };
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = defaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      return {
        seededDemo: Boolean(parsed.seededDemo),
        theme: parsed.theme === "petrol" ? "petrol" : "daylight",
        progress: parsed.progress && typeof parsed.progress === "object" ? parsed.progress : {},
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
        pilotVotes: parsed.pilotVotes && typeof parsed.pilotVotes === "object" ? parsed.pilotVotes : {},
        screeners: Array.isArray(parsed.screeners) ? parsed.screeners : [],
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : []
      };
    } catch (_) {
      return defaultState();
    }
  }

  let state = loadLocalState();

  function persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      /* Ignore storage quota / private mode failures */
    }
  }

  function emit() {
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error("[MweshiStore listener]", err);
      }
    });
  }

  const TesserStore = {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    getState() {
      return state;
    },

    getTheme() {
      return state.theme === "petrol" ? "petrol" : "daylight";
    },

    setTheme(theme) {
      state.theme = theme === "petrol" ? "petrol" : "daylight";
      persistLocal();
      emit();
      return state.theme;
    },

    getProgress(seriesId) {
      return state.progress[seriesId] || null;
    },

    getContinueWatchingList() {
      return Object.values(state.progress)
        .filter((p) => p && !p.completed && p.positionSec > 3)
        .sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    },

    async saveProgress({ seriesId, episodeId, episodeNumber, seasonNumber, positionSec, durationSec, completed }) {
      if (!seriesId || !episodeId) return;
      const safePos = Math.max(0, Math.min(864000, Math.floor(Number(positionSec) || 0)));
      const safeDur = Math.max(1, Math.min(864000, Math.floor(Number(durationSec) || 1)));
      const safeEpNum = Math.max(1, Math.round(Number(episodeNumber) || 1));
      const safeSeason = Math.max(1, Math.round(Number(seasonNumber) || 1));
      const isDone = Boolean(completed) || safePos >= safeDur - 3;

      state.progress[seriesId] = {
        seriesId: String(seriesId).slice(0, 120),
        episodeId: String(episodeId).slice(0, 120),
        episodeNumber: safeEpNum,
        seasonNumber: safeSeason,
        positionSec: isDone ? safeDur : safePos,
        durationSec: safeDur,
        completed: isDone,
        updatedAtMs: Date.now()
      };
      persistLocal();
      emit();
    },

    async clearProgress(seriesId) {
      if (seriesId) {
        delete state.progress[seriesId];
      } else {
        state.progress = {};
      }
      persistLocal();
      emit();
    },

    isInWatchlist(seriesId) {
      return state.watchlist.includes(seriesId);
    },

    async toggleWatchlist(seriesId) {
      const exists = state.watchlist.includes(seriesId);
      if (exists) {
        state.watchlist = state.watchlist.filter((id) => id !== seriesId);
      } else {
        state.watchlist = [seriesId, ...state.watchlist];
      }
      persistLocal();
      emit();
      return !exists;
    },

    hasVotedPilot(seriesId) {
      return Boolean(state.pilotVotes[seriesId]);
    },

    async togglePilotVote(seriesId) {
      const voted = Boolean(state.pilotVotes[seriesId]);
      if (voted) {
        delete state.pilotVotes[seriesId];
      } else {
        state.pilotVotes[seriesId] = true;
      }
      persistLocal();
      emit();
      return !voted;
    },

    async submitCreatorPitch(payload) {
      const entry = {
        creatorName: String(payload.creatorName || "").trim().slice(0, 120),
        email: String(payload.email || "").trim().slice(0, 200),
        seriesTitle: String(payload.seriesTitle || "").trim().slice(0, 200),
        channelUrl: String(payload.channelUrl || "").trim().slice(0, 500),
        pilotUrl: String(payload.pilotUrl || "").trim().slice(0, 500),
        toolsUsed: String(payload.toolsUsed || "").trim().slice(0, 400),
        notes: String(payload.notes || "").trim().slice(0, 1500),
        preferredTime: String(payload.preferredTime || "").trim().slice(0, 200)
      };

      state.submissions.unshift({ ...entry, createdAtMs: Date.now() });
      persistLocal();
      emit();
      return { savedLocally: true };
    },

    saveLocalScreener(screener) {
      state.screeners = [
        screener,
        ...state.screeners.filter((s) => s.slug !== screener.slug)
      ].slice(0, 25);
      persistLocal();
      emit();
    }
  };

  window.TesserStore = TesserStore;
  emit();
})();
