(function () {
  var layer = document.querySelector(".money-layer");
  if (!layer) return;

  var lowPower = document.body.classList.contains("performance-mode");
  var count = lowPower ? 14 : (window.innerWidth < 900 ? 20 : 34);

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  for (var i = 0; i < count; i++) {
    var el = document.createElement("div");
    el.className = "bill";
    el.textContent = "$";

    var size = rand(lowPower ? 34 : 38, lowPower ? 60 : 76).toFixed(0) + "px";
    var opacity = rand(lowPower ? 0.22 : 0.3, lowPower ? 0.38 : 0.56).toFixed(2);
    var x = rand(0, 100).toFixed(2) + "vw";
    var dx = rand(-120, 120);

    el.style.setProperty("--s", size);
    el.style.setProperty("--o", opacity);
    el.style.setProperty("--b", "0px");
    el.style.setProperty("--x", x);
    el.style.setProperty("--dx25", (dx * 0.25).toFixed(0) + "px");
    el.style.setProperty("--dx55", (dx * 0.55).toFixed(0) + "px");
    el.style.setProperty("--dx80", (dx * 0.8).toFixed(0) + "px");
    el.style.setProperty("--dx", dx.toFixed(0) + "px");
    el.style.setProperty("--r", rand(-26, 26).toFixed(0) + "deg");
    el.style.setProperty("--d", rand(lowPower ? 10 : 8, lowPower ? 16 : 14).toFixed(2) + "s");
    el.style.setProperty("--delay", rand(0, lowPower ? 8 : 6).toFixed(2) + "s");

    layer.appendChild(el);
  }
})();
