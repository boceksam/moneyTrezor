(function () {
  var layer = document.querySelector(".money-layer");
  if (!layer) return;

  var lowPower = document.body.classList.contains("performance-mode");
  var count = lowPower ? 10 : (window.innerWidth < 900 ? 16 : 24);
  var symbols = ["$", "$", "$", "$", "+"];

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  for (var i = 0; i < count; i++) {
    var el = document.createElement("div");
    el.className = "bill";
    el.textContent = symbols[i % symbols.length];

    var size = rand(lowPower ? 28 : 30, lowPower ? 48 : 58).toFixed(0) + "px";
    var opacity = rand(lowPower ? 0.1 : 0.14, lowPower ? 0.2 : 0.28).toFixed(2);
    var x = rand(0, 100).toFixed(2) + "vw";
    var dx = rand(-90, 90);

    el.style.setProperty("--s", size);
    el.style.setProperty("--o", opacity);
    el.style.setProperty("--b", "0px");
    el.style.setProperty("--x", x);
    el.style.setProperty("--dx25", (dx * 0.25).toFixed(0) + "px");
    el.style.setProperty("--dx55", (dx * 0.55).toFixed(0) + "px");
    el.style.setProperty("--dx80", (dx * 0.8).toFixed(0) + "px");
    el.style.setProperty("--dx", dx.toFixed(0) + "px");
    el.style.setProperty("--r", rand(-18, 18).toFixed(0) + "deg");
    el.style.setProperty("--d", rand(lowPower ? 12 : 10, lowPower ? 20 : 18).toFixed(2) + "s");
    el.style.setProperty("--delay", rand(0, lowPower ? 11 : 9).toFixed(2) + "s");

    layer.appendChild(el);
  }
})();
