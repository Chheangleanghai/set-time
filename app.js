
      const TOTAL = 7200,
        CIRC = 2 * Math.PI * 68;
      const ALERTS = [5400, 3600, 1800];
      let remaining = TOTAL,
        running = false,
        iv = null,
        speed = 1;
      const fired = new Set();

      const disp = document.getElementById("disp");
      const progBar = document.getElementById("progBar");
      const startBtn = document.getElementById("startBtn");
      const alertRow = document.getElementById("alertRow");
      const logArea = document.getElementById("logArea");
      const stateLabel = document.getElementById("stateLabel");
      const ringFill = document.getElementById("ringFill");
      const flashEl = document.getElementById("flashEl");
      const sFill = document.getElementById("sFill");
      const sThumb = document.getElementById("sThumb");
      const sVal = document.getElementById("sVal");
      const track = document.getElementById("track");

      let actx = null;
      function getACtx() {
        if (!actx)
          actx = new (window.AudioContext || window.webkitAudioContext)();
        return actx;
      }

      function tone(freq, type, startT, dur, vol) {
        const c = getACtx();
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime + startT);
        g.gain.setValueAtTime(vol || 0.35, c.currentTime + startT);
        g.gain.exponentialRampToValueAtTime(
          0.0001,
          c.currentTime + startT + dur,
        );
        o.start(c.currentTime + startT);
        o.stop(c.currentTime + startT + dur + 0.01);
      }

      function playAlert() {
        tone(440, "sine", 0, 0.12, 0.3);
        tone(660, "sine", 0, 0.12, 0.2);
        tone(880, "sine", 0.14, 0.15, 0.35);
        tone(440, "sine", 0.14, 0.15, 0.2);
        tone(1100, "sine", 0.32, 0.22, 0.4);
        tone(660, "sine", 0.32, 0.22, 0.2);
        tone(1320, "sine", 0.58, 0.35, 0.45);
      }

      function playDone() {
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
          tone(f, "sine", i * 0.22, 0.3 + (i === 4 ? 0.4 : 0), 0.38);
        });
        tone(659, "sine", 0.22 * 2 + 0.1, 0.15, 0.15);
      }

      function fmt(s) {
        const h = Math.floor(s / 3600),
          m = Math.floor((s % 3600) / 60),
          sec = s % 60;
        if (h > 0)
          return (
            h +
            ":" +
            String(m).padStart(2, "0") +
            ":" +
            String(sec).padStart(2, "0")
          );
        return m + ":" + String(sec).padStart(2, "0");
      }

      function updateUI() {
        disp.textContent = fmt(remaining);
        const pct = remaining / TOTAL;
        progBar.style.width = pct * 100 + "%";
        ringFill.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(2);
        if (remaining <= 600) {
          disp.className = "digits danger";
          progBar.className = "prog-bar danger";
          ringFill.style.stroke = "#A32D2D";
        } else if (remaining <= 1800) {
          disp.className = "digits warn";
          progBar.className = "prog-bar warn";
          ringFill.style.stroke = "#BA7517";
        } else {
          disp.className = "digits";
          progBar.className = "prog-bar";
          ringFill.style.stroke = "#185FA5";
        }
        const next = ALERTS.find((a) => a < remaining && !fired.has(a));
        if (next != null)
          alertRow.innerHTML = "Next alert at <b>" + fmt(next) + "</b>";
        else if (remaining > 0)
          alertRow.textContent = "Final stretch — no more alerts";
        else alertRow.textContent = "";
      }

      function addLog(msg, done) {
        const d = document.createElement("div");
        d.className = "log-item" + (done ? " done" : "");
        d.innerHTML =
          '<i class="ti ' +
          (done ? "ti-check" : "ti-bell") +
          '" style="font-size:13px;vertical-align:-1px;margin-right:6px"></i>' +
          msg;
        logArea.appendChild(d);
      }

      function flash() {
        flashEl.style.opacity = "0.25";
        setTimeout(() => (flashEl.style.opacity = "0"), 400);
      }

      function tick() {
        for (let i = 0; i < speed; i++) {
          if (remaining <= 0) break;
          remaining--;
          ALERTS.forEach((a) => {
            if (remaining === a && !fired.has(a)) {
              fired.add(a);
              playAlert();
              addLog("Alert — " + fmt(a) + " remaining");
              flash();
            }
          });
        }
        updateUI();
        if (remaining <= 0) {
          remaining = 0;
          running = false;
          clearInterval(iv);
          startBtn.innerHTML = '<i class="ti ti-player-play"></i> Start';
          stateLabel.textContent = "done";
          playDone();
          addLog("Timer complete — 2 hours elapsed!", true);
        }
      }

      function startIv() {
        clearInterval(iv);
        iv = setInterval(tick, 1000);
      }

      function toggle() {
        if (remaining === 0) return;
        running = !running;
        if (running) {
          getACtx();
          startIv();
          startBtn.innerHTML = '<i class="ti ti-player-pause"></i> Pause';
          stateLabel.textContent = "running";
        } else {
          clearInterval(iv);
          startBtn.innerHTML = '<i class="ti ti-player-play"></i> Resume';
          stateLabel.textContent = "paused";
        }
      }

      function resetTimer() {
        clearInterval(iv);
        running = false;
        remaining = TOTAL;
        fired.clear();
        startBtn.innerHTML = '<i class="ti ti-player-play"></i> Start';
        stateLabel.textContent = "ready";
        logArea.querySelectorAll(".log-item").forEach((l) => l.remove());
        updateUI();
      }

      function setSpeed(v) {
        speed = Math.min(60, Math.max(1, Math.round(v)));
        const pct = ((speed - 1) / 59) * 100;
        sFill.style.width = pct + "%";
        sThumb.style.left = pct + "%";
        sVal.textContent = speed + "×";
        if (running) startIv();
      }

      function pctFromEvent(e) {
        const r = track.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        return Math.min(1, Math.max(0, x / r.width));
      }

      let dragging = false;
      function dragStart(e) {
        e.preventDefault();
        dragging = true;
        setSpeed(1 + pctFromEvent(e) * 59);
      }
      document.addEventListener("mousemove", (e) => {
        if (dragging) setSpeed(1 + pctFromEvent(e) * 59);
      });
      document.addEventListener(
        "touchmove",
        (e) => {
          if (dragging) setSpeed(1 + pctFromEvent(e) * 59);
        },
        { passive: true },
      );
      document.addEventListener("mouseup", () => (dragging = false));
      document.addEventListener("touchend", () => (dragging = false));

      function onWheel(e) {
        e.preventDefault();
        setSpeed(speed + (e.deltaY < 0 ? 1 : -1));
      }

      document.addEventListener(
        "keydown",
        function (e) {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
          }
        },
        true,
      );

      setSpeed(1);
      updateUI();