(function () {
  var layer = document.querySelector(".money-layer");
  if (!layer) return;

  var COUNT = 34;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  for (var i = 0; i < COUNT; i++) {
    var el = document.createElement("div");
    el.className = "bill";
    el.textContent = "💵";

    var size = rand(36, 70).toFixed(0) + "px";
    var opacity = rand(0.26, 0.5).toFixed(2);
    var blur = rand(0, 0.35).toFixed(2) + "px";

    var x = rand(0, 100).toFixed(2) + "vw";
    var dx = rand(-90, 90);

    var dx25 = (dx * 0.25).toFixed(0) + "px";
    var dx55 = (dx * 0.55).toFixed(0) + "px";
    var dx80 = (dx * 0.80).toFixed(0) + "px";
    var dx100 = dx.toFixed(0) + "px";

    var r = rand(-20, 20).toFixed(0) + "deg";
    var duration = rand(8, 16).toFixed(2) + "s";
    var delay = rand(0, 7).toFixed(2) + "s";

    el.style.setProperty("--s", size);
    el.style.setProperty("--o", opacity);
    el.style.setProperty("--b", blur);
    el.style.setProperty("--x", x);
    el.style.setProperty("--dx25", dx25);
    el.style.setProperty("--dx55", dx55);
    el.style.setProperty("--dx80", dx80);
    el.style.setProperty("--dx", dx100);
    el.style.setProperty("--r", r);
    el.style.setProperty("--d", duration);
    el.style.setProperty("--delay", delay);

    layer.appendChild(el);
  }
})();
