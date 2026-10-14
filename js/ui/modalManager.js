import { SpeedChart } from "./chartRenderer.js";

/**
 * UI Modal Manager for Results, Multiplayer, and History
 */
export class ModalManager {
  constructor() {
    this.resultsModal = document.getElementById("results-modal");
    this.multiplayerModal = document.getElementById("multiplayer-modal");
    this.historyModal = document.getElementById("history-modal");

    this.chartCanvas = document.getElementById("speed-chart");
    this.chart = this.chartCanvas ? new SpeedChart(this.chartCanvas) : null;

    this._bindCloseEvents();
  }

  _bindCloseEvents() {
    document.querySelectorAll(".modal-close-btn, .modal-backdrop-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeAll();
      });
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAll();
      }
    });
  }

  closeAll() {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.classList.remove("active");
    });
  }

  showResults(stats, isNewPb = false) {
    this.closeAll();
    if (!this.resultsModal) return;

    // Populate data
    document.getElementById("res-net-wpm").textContent = stats.netWpm;
    document.getElementById("res-acc").textContent = `${stats.accuracy}%`;
    document.getElementById("res-gross-wpm").textContent = stats.grossWpm;
    document.getElementById("res-cpm").textContent = stats.cpm;
    document.getElementById("res-consistency").textContent = `${stats.consistency}%`;
    document.getElementById("res-time").textContent = `${Math.round(stats.time)}s`;
    document.getElementById("res-errors").textContent = stats.totalErrors;

    const pbBadge = document.getElementById("res-pb-badge");
    if (pbBadge) {
      pbBadge.style.display = isNewPb ? "inline-flex" : "none";
    }

    this.resultsModal.classList.add("active");

    // Render Canvas chart
    if (this.chart && stats.speedTimeline && stats.speedTimeline.length > 0) {
      setTimeout(() => {
        this.chart.render(stats.speedTimeline, stats.errorTimeline);
      }, 50);
    }
  }

  showMultiplayer() {
    this.closeAll();
    if (this.multiplayerModal) {
      this.multiplayerModal.classList.add("active");
    }
  }

  showHistory(historyList = []) {
    this.closeAll();
    if (!this.historyModal) return;

    const tableBody = document.getElementById("history-table-body");
    if (tableBody) {
      tableBody.innerHTML = "";
      if (historyList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 20px;">Hozircha natijalar mavjud emas</td></tr>`;
      } else {
        historyList.slice(0, 20).forEach((item) => {
          const row = document.createElement("tr");
          const dateStr = new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          row.innerHTML = `
            <td style="color: var(--accent-gold); font-weight: 700; font-family: var(--font-mono);">${item.netWpm} WPM</td>
            <td>${item.accuracy}%</td>
            <td>${item.mode} (${item.modeValue})</td>
            <td style="text-transform: capitalize;">${item.language}</td>
            <td style="color: var(--text-secondary); font-size: 12px;">${dateStr}</td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    this.historyModal.classList.add("active");
  }
}
