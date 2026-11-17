/* Demo player: episodes in order, saved progress, end-of-episode card, Cinema/Feed modes.
   Episodes are time ranges of one stand-in file. With a real series, give each episode its own `src`. */
(function () {
  var EPISODES = [
    { title: "Part one", start: 0, end: 180 },
    { title: "Part two", start: 180, end: 360 },
    { title: "Part three", start: 360, end: 560 },
    { title: "Part four", start: 560, end: null } // end = video duration
  ];
  var KEY = "tesser.demo.v1";

  var video = document.getElementById("player");
  var list = document.querySelector("[data-episodes]");
  var nowTitle = document.querySelector("[data-now-title]");
  var endCard = document.querySelector("[data-end-card]");
  var endText = document.querySelector("[data-end-text]");
  var nextBtn = document.querySelector("[data-next]");
  var cont = document.querySelector("[data-continue]");
  var resumeBtn = document.querySelector("[data-resume]");
  var screen = document.querySelector("[data-screen]");

  var state = load();
  var current = 0;
  var lastSave = 0;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { progress: {}, last: null }; }
    catch (e) { return { progress: {}, last: null }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function endOf(i) { return EPISODES[i].end != null ? EPISODES[i].end : (video.duration || 734); }
  function lenOf(i) { return endOf(i) - EPISODES[i].start; }
  function fmt(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function label(i) { return "Episode " + (i + 1); }
  function indexAt(t) {
    for (var i = EPISODES.length - 1; i >= 0; i--) if (t >= EPISODES[i].start) return i;
    return 0;
  }

  function render() {
    list.innerHTML = "";
    EPISODES.forEach(function (ep, i) {
      var p = Math.round((state.progress[i] || 0) * 100);
      var li = document.createElement("li");
      li.innerHTML =
        '<button class="ep" type="button" aria-current="' + (i === current) + '">' +
          '<span class="ep-num">' + (i + 1) + "</span>" +
          '<span class="ep-title">' + label(i) + '<span class="visually-hidden">, ' + ep.title + "</span></span>" +
          '<span class="ep-dur">' + fmt(lenOf(i)) + "</span>" +
          '<span class="ep-progress" style="--p:' + p + '%" aria-hidden="true"></span>' +
        "</button>";
      li.querySelector("button").addEventListener("click", function () { play(i, null); });
      list.appendChild(li);
    });
    nowTitle.textContent = label(current) + " \u00b7 " + EPISODES[current].title;
    renderContinue();
  }

  function renderContinue() {
    var l = state.last;
    if (!l || (state.progress[l.i] || 0) >= 0.98) { cont.hidden = true; return; }
    cont.hidden = false;
    resumeBtn.textContent = label(l.i) + " \u00b7 " + fmt(endOf(l.i) - l.t) + " left";
  }

  function play(i, at) {
    current = i;
    endCard.hidden = true;
    video.currentTime = at != null ? at : EPISODES[i].start;
    var pr = video.play();
    if (pr && pr.catch) pr.catch(function () {});
    render();
    video.focus({ preventScroll: true });
  }

  function showEnd() {
    video.pause();
    state.progress[current] = 1;
    save();
    var hasNext = current < EPISODES.length - 1;
    endText.textContent = hasNext ? "End of " + label(current) + "." : "End of Season 1.";
    nextBtn.hidden = !hasNext;
    if (hasNext) nextBtn.textContent = "Play " + label(current + 1);
    endCard.hidden = false;
    render();
    if (hasNext) nextBtn.focus({ preventScroll: true });
  }

  video.addEventListener("loadedmetadata", render);

  video.addEventListener("timeupdate", function () {
    var t = video.currentTime;
    if (!endCard.hidden) return;
    if (t >= endOf(current) - 0.25 && current < EPISODES.length - 1) { showEnd(); return; }
    var frac = Math.min(1, Math.max(0, (t - EPISODES[current].start) / lenOf(current)));
    state.progress[current] = Math.max(state.progress[current] || 0, frac);
    state.last = { i: current, t: t };
    if (Date.now() - lastSave > 2000) { save(); lastSave = Date.now(); renderProgressOnly(); }
  });

  video.addEventListener("ended", showEnd);

  // If the viewer scrubs into another part, follow them.
  video.addEventListener("seeked", function () {
    var i = indexAt(video.currentTime);
    if (i !== current) { current = i; endCard.hidden = true; render(); }
  });

  // Pressing native play on the end card means "keep going".
  video.addEventListener("play", function () {
    if (!endCard.hidden && current < EPISODES.length - 1) play(current + 1, null);
  });

  function renderProgressOnly() {
    var bars = list.querySelectorAll(".ep-progress");
    bars.forEach(function (b, i) { b.style.setProperty("--p", Math.round((state.progress[i] || 0) * 100) + "%"); });
  }

  nextBtn.addEventListener("click", function () { play(current + 1, null); });
  resumeBtn.addEventListener("click", function () { if (state.last) play(state.last.i, state.last.t); });

  document.querySelectorAll("[data-mode-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-mode-btn");
      screen.setAttribute("data-mode", mode);
      document.querySelectorAll("[data-mode-btn]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
    });
  });

  window.addEventListener("pagehide", save);
  render();
})();
