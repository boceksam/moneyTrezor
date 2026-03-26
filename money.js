(function () {
  var layer = document.querySelector(".money-layer");
  if (!layer) return;

  var lowPower = document.body.classList.contains("performance-mode");
  var COUNT = lowPower ? 14 : (window.innerWidth < 900 ? 20 : 34);

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  for (var i = 0; i < COUNT; i++) {
    var el = document.createElement("div");
    el.className = "bill";
    el.textContent = "💵";

    var size = rand(lowPower ? 34 : 38, lowPower ? 60 : 76).toFixed(0) + "px";
    var opacity = rand(lowPower ? 0.24 : 0.32, lowPower ? 0.42 : 0.58).toFixed(2);
    var blur = "0px";

    var x = rand(0, 100).toFixed(2) + "vw";
    var dx = rand(-120, 120);

    var dx25 = (dx * 0.25).toFixed(0) + "px";
    var dx55 = (dx * 0.55).toFixed(0) + "px";
    var dx80 = (dx * 0.80).toFixed(0) + "px";
    var dx100 = dx.toFixed(0) + "px";

    var r = rand(-26, 26).toFixed(0) + "deg";
    var duration = rand(lowPower ? 10 : 8, lowPower ? 16 : 14).toFixed(2) + "s";
    var delay = rand(0, lowPower ? 8 : 6).toFixed(2) + "s";

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
