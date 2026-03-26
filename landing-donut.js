(function () {
  var labels = ["Bydlení", "Jídlo", "Doprava", "Volný čas", "Předplatné", "Zdraví", "Ostatní"];
  var values = [9800, 4300, 4600, 3400, 1200, 2100, 2600];
  var total = values.reduce(function (sum, value) { return sum + value; }, 0);
  var chartInstance = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function createRadialSegmentGradient(ctx, chartArea, innerColor, outerColor) {
    if (!chartArea) return outerColor;
    var centerX = (chartArea.left + chartArea.right) / 2;
    var centerY = (chartArea.top + chartArea.bottom) / 2;
    var radius = Math.max(chartArea.width, chartArea.height) / 2;
    var gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);
    return gradient;
  }

  function getExpenseDonutBackgrounds(chartArea, ctx) {
    return [
      createRadialSegmentGradient(ctx, chartArea, "rgba(224, 193, 255, 1)", "rgba(173, 97, 255, 0.96)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(165, 255, 225, 1)", "rgba(30, 198, 143, 0.96)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(173, 244, 255, 1)", "rgba(49, 206, 255, 0.96)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(255, 188, 188, 1)", "rgba(255, 96, 96, 0.96)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(255, 239, 173, 1)", "rgba(212, 175, 55, 0.98)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(190, 212, 255, 1)", "rgba(94, 143, 255, 0.96)"),
      createRadialSegmentGradient(ctx, chartArea, "rgba(255, 221, 174, 1)", "rgba(255, 171, 71, 0.96)")
    ];
  }

  function getExpenseDonutSolidColors() {
    return ["#b988ff", "#42d6a4", "#51dcff", "#ff6b6b", "#e4c15a", "#7d9bff", "#ffbc63"];
  }

  function setActiveItems(selector, activeIndex) {
    document.querySelectorAll(selector).forEach(function (element) {
      var elementIndex = Number(element.getAttribute("data-expense-index"));
      element.classList.toggle("is-active", activeIndex === elementIndex);
    });
  }

  var centerTextPlugin = {
    id: "centerTextPlugin",
    afterDraw: function (chart, args, pluginOptions) {
      var ctx = chart.ctx;
      var meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      var x = meta.data[0].x;
      var y = meta.data[0].y;
      var innerRadius = meta.data[0].innerRadius || 70;
      var safeRadius = Math.max(innerRadius - 6, 0);
      var activeElement = chart.getActiveElements && chart.getActiveElements()[0];
      var chartLabels = chart.data && chart.data.labels || [];
      var dataset = chart.data && chart.data.datasets && chart.data.datasets[0];

      if (!Number.isFinite(x) || !Number.isFinite(y) || safeRadius <= 0) {
        return;
      }

      var label = pluginOptions && pluginOptions.labelText || "";
      var totalText = pluginOptions && pluginOptions.totalText || "";
      var sublabel = pluginOptions && pluginOptions.subLabelText || "";

      if (activeElement && dataset) {
        var activeIndex = activeElement.index;
        var activeValue = Number(dataset.data && dataset.data[activeIndex] || 0);
        var activeLabel = String(chartLabels[activeIndex] || "");
        var totalValue = Number(pluginOptions && pluginOptions.totalValue || 0);
        var percent = totalValue ? ((activeValue / totalValue) * 100).toFixed(1) : "";

        label = activeLabel;
        totalText = formatCurrency(activeValue);
        sublabel = percent ? percent + " % z výdajů" : "";
      }

      function fitText(text, weight, maxSize, minSize) {
        if (!text) return minSize;
        var fontSize = maxSize;
        var maxWidth = innerRadius * 1.42;
        while (fontSize > minSize) {
          ctx.font = weight + " " + fontSize + "px Segoe UI, Arial, sans-serif";
          if (ctx.measureText(text).width <= maxWidth) break;
          fontSize -= 1;
        }
        return fontSize;
      }

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.beginPath();
      ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(9, 14, 22, 0.82)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (label) {
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.font = "700 " + fitText(label, 700, 13, 9) + "px Segoe UI, Arial, sans-serif";
        ctx.fillText(label, x, y - innerRadius * 0.26);
      }

      if (totalText) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 " + fitText(totalText, 800, 24, 13) + "px Segoe UI, Arial, sans-serif";
        ctx.shadowColor = "rgba(212, 175, 55, 0.22)";
        ctx.shadowBlur = 18;
        ctx.fillText(totalText, x, y + 1);
        ctx.shadowBlur = 0;
      }

      if (sublabel) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "700 " + fitText(sublabel, 700, 11, 9) + "px Segoe UI, Arial, sans-serif";
        ctx.fillText(sublabel, x, y + innerRadius * 0.25);
      }

      ctx.restore();
    }
  };

  var premiumGlowPlugin = {
    id: "premiumGlowPlugin",
    beforeDatasetDraw: function (chart) {
      var ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = "rgba(212, 175, 55, 0.24)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
    },
    afterDatasetDraw: function (chart) {
      chart.ctx.restore();
    }
  };

  function getPremiumDonutOptions(config) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      radius: "96%",
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1400,
        easing: "easeOutQuart"
      },
      interaction: {
        mode: "nearest",
        intersect: false
      },
      onHover: function (event, activeElements) {
        if (typeof config.onHoverChange === "function") {
          config.onHoverChange(activeElements && activeElements[0] ? activeElements[0].index : null);
        }
      },
      layout: {
        padding: 14
      },
      elements: {
        arc: {
          borderWidth: 0,
          borderRadius: 18,
          hoverBorderWidth: 2,
          hoverBorderColor: "rgba(255,255,255,0.30)"
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        },
        centerTextPlugin: {
          labelText: "Výdaje celkem",
          totalText: formatCurrency(total),
          subLabelText: labels.length + " kategorií",
          totalValue: total
        }
      }
    };
  }

  function renderLegend() {
    var container = document.getElementById("landingExpenseDonutLegend");
    if (!container) return;

    var colors = getExpenseDonutSolidColors();
    var items = labels.map(function (label, index) {
      var value = Number(values[index] || 0);
      return {
        index: index,
        label: label,
        value: value,
        percent: total ? (value / total) * 100 : 0,
        color: colors[index % colors.length]
      };
    }).sort(function (a, b) { return b.value - a.value; });

    container.innerHTML = items.map(function (item) {
      return '\n        <div class="expense-legend-item" data-expense-index="' + item.index + '">\n          <span class="expense-legend-swatch" style="background:' + item.color + '"></span>\n          <div class="expense-legend-main">\n            <div class="expense-legend-label-row">\n              <span class="expense-legend-label">' + escapeHtml(item.label) + '</span>\n              <span class="expense-legend-percent">' + item.percent.toFixed(1) + ' %</span>\n            </div>\n            <div class="expense-legend-bar">\n              <div class="expense-legend-fill" style="width:' + Math.max(item.percent, 4) + '%; background:linear-gradient(90deg, ' + item.color + ', ' + item.color + 'cc);"></div>\n            </div>\n          </div>\n          <strong class="expense-legend-value">' + formatCurrency(item.value) + '</strong>\n        </div>\n      ';
    }).join("");
  }

  function renderHighlights() {
    var container = document.getElementById("landingExpenseDonutHighlights");
    if (!container) return;

    var items = labels.map(function (label, index) {
      return {
        label: label,
        value: Number(values[index] || 0),
        percent: total ? (Number(values[index] || 0) / total) * 100 : 0
      };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, 3);

    container.innerHTML = items.map(function (item, index) {
      return '\n        <div class="expense-highlight expense-highlight-rank-' + (index + 1) + '">\n          <div class="expense-highlight-top">\n            <span class="expense-highlight-rank">Top ' + (index + 1) + '</span>\n            <span class="expense-highlight-share">' + item.percent.toFixed(1) + ' %</span>\n          </div>\n          <div class="expense-highlight-main">\n            <span class="expense-highlight-label">' + escapeHtml(item.label) + '</span>\n            <span class="expense-highlight-value">' + formatCurrency(item.value) + '</span>\n          </div>\n        </div>\n      ';
    }).join("");
  }

  function renderChart() {
    var canvas = document.getElementById("landingExpenseDonutChart");
    if (!canvas || typeof Chart === "undefined") return;

    renderLegend();
    renderHighlights();

    var config = {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: function (context) {
            var chart = context.chart;
            return getExpenseDonutBackgrounds(chart.chartArea, chart.ctx);
          },
          hoverBackgroundColor: getExpenseDonutSolidColors(),
          borderColor: "rgba(7, 14, 22, 0.88)",
          borderWidth: 4,
          borderAlign: "inner",
          hoverBorderWidth: 5,
          hoverOffset: 18,
          spacing: 5
        }]
      },
      options: getPremiumDonutOptions({
        onHoverChange: function (activeIndex) {
          setActiveItems("#landingExpenseDonutLegend .expense-legend-item", activeIndex);
        }
      }),
      plugins: [centerTextPlugin, premiumGlowPlugin]
    };

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(canvas, config);
  }

  document.addEventListener("DOMContentLoaded", renderChart);
})();
