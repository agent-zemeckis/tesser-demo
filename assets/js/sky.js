/* The signature detail: the hero's sky follows the visitor's local time,
   and the dusk beacon appears after dark.
   Test any hour with ?hour=19.5 in the URL, or via window.TesserSky.set(h). */
(function () {
  var root = document.documentElement;

  // [hour, [r, g, b]]
  var stops = [
    [0, [11, 11, 13]],
    [4.5, [12, 12, 15]],
    [6.5, [30, 24, 22]],   // dawn, faintly warm
    [9, [22, 23, 26]],     // morning, cool
    [13, [23, 25, 27]],    // midday, coolest
    [17, [30, 24, 19]],    // late afternoon
    [19, [46, 29, 17]],    // dusk, amber
    [20.5, [33, 22, 15]],
    [22, [16, 13, 11]],
    [24, [11, 11, 13]]
  ];

  function colourAt(h) {
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      if (h >= a[0] && h <= b[0]) {
        var t = (h - a[0]) / (b[0] - a[0]);
        var c = a[1].map(function (v, k) { return Math.round(v + (b[1][k] - v) * t); });
        return "rgb(" + c.join(" ") + ")";
      }
    }
    return "rgb(11 11 13)";
  }

  // Visible 17:30–22:30, sinking toward the horizon as the evening goes on.
  function starAt(h) {
    if (h < 17.5 || h > 22.5) return { o: 0, y: 30 };
    var t = (h - 17.5) / 5;
    var o = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
    return { o: o.toFixed(2), y: 22 + t * 50 };
  }

  function caption(h) {
    if (h >= 5 && h < 12) return "Good morning. Tesser is a fold between worlds; the screening room warms up after dusk.";
    if (h >= 12 && h < 17.5) return "Good afternoon. Tesser is a fold between worlds; the screening room warms up after dusk.";
    if (h >= 17.5 && h < 22.5) return "Good evening. The light is down where you are. Tesser is open for the night\u2019s run.";
    return "It\u2019s late where you are. The dusk light has set. The episodes haven\u2019t.";
  }

  function apply(h) {
    var s = starAt(h);
    root.style.setProperty("--sky", colourAt(h));
    root.style.setProperty("--star-o", s.o);
    root.style.setProperty("--star-y", s.y + "%");
    var el = document.querySelector("[data-sky-caption]");
    if (el) el.textContent = caption(h);
  }

  function now() {
    var d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  var q = new URLSearchParams(location.search).get("hour");
  var override = q !== null && q !== "" && !isNaN(+q) ? Math.min(23.99, Math.max(0, +q)) : null;

  function tick() { apply(override === null ? now() : override); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
  setInterval(function () { if (override === null) tick(); }, 5 * 60 * 1000);

  window.TesserSky = {
    set: function (h) { override = h; tick(); },
    clear: function () { override = null; tick(); }
  };
})();
