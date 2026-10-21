(() => {
  "use strict";

  // ===================== DANE =====================
  const REGIONS = ["eu", "as", "af", "na", "sa", "oc"];
  const MODES = ["flag-country", "capital-country", "flag-capital"];

  const COUNTRIES = window.COUNTRIES_RAW.map(([code, name, capital, region, aliases = [], capAliases = []]) => {
    const [enName, enCapital, enAliases = [], enCapAliases = []] = window.COUNTRIES_EN[code];
    return {
      code, region,
      pl: { name, capital, aliases, capAliases },
      en: { name: enName, capital: enCapital, aliases: enAliases, capAliases: enCapAliases }
    };
  });

  const flagUrl = (code, w = 320) => `https://flagcdn.com/w${w}/${code}.png`;

  // ===================== USTAWIENIA =====================
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("fs_" + key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("fs_" + key, JSON.stringify(value)); } catch { /* brak dostępu */ }
    }
  };

  const browserLang = (navigator.language || "pl").toLowerCase().startsWith("pl") ? "pl" : "en";

  const DEFAULTS = {
    lang: browserLang,
    time: "10",
    answerMode: "choice",
    count: "10",
    sound: "on",
    regions: REGIONS.slice()
  };

  const settings = Object.assign({}, DEFAULTS, store.get("settings", {}));
  if (!window.I18N[settings.lang]) settings.lang = "pl";
  const saveSettings = () => store.set("settings", settings);

  // ===================== TŁUMACZENIA =====================
  const t = (key, vars = {}) => {
    const s = window.I18N[settings.lang][key] ?? window.I18N.pl[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  };

  const L = (c) => c[settings.lang];          // dane państwa w bieżącym języku
  const nameOf = (c) => L(c).name;
  const capitalOf = (c) => L(c).capital;

  const applyStaticTexts = () => {
    document.documentElement.lang = settings.lang;
    document.title = t("pageTitle");
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $$("[data-i18n-title]").forEach((el) => el.setAttribute("title", t(el.dataset.i18nTitle)));
    $$(".lang-switch button").forEach((b) => b.classList.toggle("active", b.dataset.lang === settings.lang));
    $("#q-flag").alt = t("flagAlt");
  };

  const setLang = (lang) => {
    if (!window.I18N[lang] || lang === settings.lang) return;
    settings.lang = lang;
    saveSettings();
    applyStaticTexts();
    // Odśwież to, co aktualnie widać
    const active = $(".screen.active").id.replace("screen-", "");
    if (active === "menu") renderMenu();
    if (active === "settings") renderSettings();
    if (active === "game") renderQuestionTexts();
    if (active === "result") renderResult();
  };

  // ===================== POMOCNICZE =====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const normalize = (s) =>
    s.toLowerCase()
      .replace(/ł/g, "l")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/^the\s+/, "")
      .replace(/\bsaint\b/g, "st")
      .replace(/[^a-z0-9]/g, "");

  const levenshtein = (a, b) => {
    if (a === b) return 0;
    const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return dp[b.length];
  };

  // Wpisana odpowiedź jest poprawna, jeśli pasuje do nazwy lub aliasu
  // (w dowolnym języku, bez znaków diakrytycznych, z tolerancją na drobne literówki).
  const matches = (input, accepted) => {
    const n = normalize(input);
    if (!n) return false;
    return accepted.some((a) => {
      const target = normalize(a);
      if (n === target) return true;
      const tolerance = target.length >= 9 ? 2 : target.length >= 5 ? 1 : 0;
      return levenshtein(n, target) <= tolerance;
    });
  };

  // ===================== DŹWIĘK =====================
  let audioCtx = null;
  const beep = (ok) => {
    if (settings.sound !== "on") return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = ok ? 880 : 220;
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (ok ? 0.18 : 0.35));
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.4);
    } catch { /* brak audio */ }
  };

  // ===================== EKRANY =====================
  const show = (name) => {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
    if (name === "menu") renderMenu();
    if (name === "settings") renderSettings();
    window.scrollTo(0, 0);
  };

  $$("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      if (game.active && !confirm(t("confirmAbort"))) return;
      stopGame();
      show(b.dataset.go);
    })
  );

  $$(".lang-switch button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  // ===================== MENU =====================
  const pool = () => COUNTRIES.filter((c) => settings.regions.includes(c.region));

  const renderMenu = () => {
    $("#menu-summary").textContent = t("summary", {
      time: settings.time === "60" ? "1 min" : settings.time + " s",
      count: settings.count === "0" ? t("allLower") : settings.count,
      answer: settings.answerMode === "choice" ? t("choiceLower") : t("typingLower"),
      pool: pool().length
    });

    const best = store.get("best", {});
    $("#best-scores").innerHTML = MODES
      .map((m) => {
        const b = best[m];
        return `<div>${t("mode_" + m)}<br>${t("record")}: <b>${b ? b.points + " " + t("pts") : "—"}</b>${b ? ` (${b.correct}/${b.total})` : ""}</div>`;
      })
      .join("");
  };

  $$(".mode-card").forEach((card) =>
    card.addEventListener("click", () => startGame(card.dataset.mode))
  );

  // ===================== USTAWIENIA (UI) =====================
  const renderSettings = () => {
    $$(".seg").forEach((seg) => {
      const key = seg.dataset.setting;
      seg.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("active", b.dataset.value === String(settings[key]))
      );
    });

    $("#region-checks").innerHTML = REGIONS
      .map((k) => {
        const count = COUNTRIES.filter((c) => c.region === k).length;
        return `<label><input type="checkbox" value="${k}" ${settings.regions.includes(k) ? "checked" : ""}> ${t("region_" + k)} <span class="muted">(${count})</span></label>`;
      })
      .join("");

    $$("#region-checks input").forEach((cb) =>
      cb.addEventListener("change", () => {
        const checked = $$("#region-checks input:checked").map((x) => x.value);
        if (checked.length === 0) {
          cb.checked = true; // przynajmniej jeden region
          return;
        }
        settings.regions = checked;
        saveSettings();
      })
    );
  };

  $$(".seg").forEach((seg) =>
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (seg.dataset.setting === "lang") { setLang(b.dataset.value); return; }
      settings[seg.dataset.setting] = b.dataset.value;
      saveSettings();
      renderSettings();
    })
  );

  $("#btn-reset").addEventListener("click", () => {
    if (confirm(t("confirmReset"))) {
      store.set("best", {});
      alert(t("resetDone"));
    }
  });

  // ===================== GRA =====================
  const game = {
    active: false,
    mode: null,
    questions: [],
    index: 0,
    correct: 0,
    points: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],
    options: [],
    answered: false,
    last: null,          // wynik ostatniej odpowiedzi (do odświeżenia po zmianie języka)
    answeredCount: 0,
    newRecord: false,
    timerId: null,
    nextId: null,
    startTime: 0,
    limit: 10
  };

  const stopTimers = () => {
    clearInterval(game.timerId);
    clearTimeout(game.nextId);
    game.timerId = null;
    game.nextId = null;
  };

  const stopGame = () => {
    stopTimers();
    game.active = false;
  };

  const startGame = (mode) => {
    const p = shuffle(pool());
    const count = settings.count === "0" ? p.length : Math.min(Number(settings.count), p.length);
    Object.assign(game, {
      active: true,
      mode,
      questions: p.slice(0, count),
      index: 0,
      correct: 0,
      points: 0,
      streak: 0,
      bestStreak: 0,
      mistakes: [],
      limit: Number(settings.time)
    });
    show("game");
    nextQuestion();
  };

  // Odpowiedź, którą trzeba podać w danym trybie
  const answerOf = (c) => (game.mode === "flag-capital" ? capitalOf(c) : nameOf(c));
  // Akceptowane odpowiedzi wpisywane – w obu językach
  const acceptedOf = (c) =>
    game.mode === "flag-capital"
      ? [c.pl.capital, ...c.pl.capAliases, c.en.capital, ...c.en.capAliases]
      : [c.pl.name, ...c.pl.aliases, c.en.name, ...c.en.aliases];

  // 3 błędne odpowiedzi – najlepiej z tego samego regionu (trudniej zgadnąć)
  const distractors = (c) => {
    const target = answerOf(c);
    const valid = (x) => x !== c && answerOf(x) !== target;
    const sameRegion = shuffle(COUNTRIES.filter((x) => x.region === c.region && valid(x)));
    const others = shuffle(COUNTRIES.filter((x) => x.region !== c.region && valid(x)));
    return [...sameRegion, ...others].slice(0, 3);
  };

  const updateHud = () => {
    $("#hud-progress").textContent = `${game.index + 1} / ${game.questions.length}`;
    $("#hud-score").textContent = `${t("score")}: ${game.points} ${t("pts")}`;
    $("#hud-streak").textContent = game.streak >= 2 ? `🔥 ${game.streak}` : "";
  };

  const nextQuestion = () => {
    stopTimers();
    if (game.index >= game.questions.length) return finishGame();

    const c = game.questions[game.index];
    game.answered = false;
    game.last = null;

    $("#btn-next").hidden = true;

    const flagImg = $("#q-flag");
    const qText = $("#q-text");
    if (game.mode === "capital-country") {
      flagImg.hidden = true;
      qText.hidden = false;
    } else {
      qText.hidden = true;
      flagImg.hidden = false;
      flagImg.src = flagUrl(c.code, 640);
    }

    // Preload flagi następnego pytania
    const nxt = game.questions[game.index + 1];
    if (nxt) new Image().src = flagUrl(nxt.code, 640);

    const choiceBox = $("#answers-choice");
    const typeForm = $("#answers-type");
    const input = $("#type-input");

    if (settings.answerMode === "choice") {
      typeForm.hidden = true;
      choiceBox.hidden = false;
      game.options = shuffle([c, ...distractors(c)]);
      const withFlag = game.mode === "capital-country";
      choiceBox.innerHTML = game.options
        .map((o, i) => `
          <button class="choice ${withFlag ? "with-flag" : ""}" data-code="${o.code}">
            <span class="key">${i + 1}</span>
            ${withFlag ? `<img src="${flagUrl(o.code, 160)}" alt="">` : ""}
            <span class="label"></span>
          </button>`)
        .join("");
      choiceBox.querySelectorAll(".choice").forEach((b) =>
        b.addEventListener("click", () => answerChoice(b.dataset.code))
      );
    } else {
      choiceBox.hidden = true;
      typeForm.hidden = false;
      input.value = "";
      input.disabled = false;
      input.className = "";
      setTimeout(() => input.focus(), 50);
    }

    renderQuestionTexts();
    startTimer();
  };

  // Wszystkie teksty zależne od języka na ekranie gry
  const renderQuestionTexts = () => {
    if (!game.questions.length) return;
    const c = game.questions[game.index];
    if (!c) return;

    updateHud();
    $("#prompt").textContent = t("prompt_" + game.mode);
    $("#q-text").textContent = capitalOf(c);
    $("#type-input").placeholder = game.mode === "flag-capital" ? t("typeCapital") : t("typeCountry");
    $$("#answers-choice .choice").forEach((b) => {
      const o = COUNTRIES.find((x) => x.code === b.dataset.code);
      b.querySelector(".label").textContent = answerOf(o);
    });
    $("#btn-quit").textContent = t("quit");

    const btn = $("#btn-next");
    btn.textContent = game.index + 1 >= game.questions.length ? t("seeResult") : t("next");

    const fb = $("#feedback");
    if (!game.last) {
      fb.className = "feedback";
      fb.innerHTML = "";
      return;
    }
    const { ok, timeout, gained } = game.last;
    const full = escapeHtml(t("capitalOf", { country: nameOf(c), capital: capitalOf(c) }));
    const answer = escapeHtml(answerOf(c));
    fb.className = "feedback " + (ok ? "ok" : "bad");
    fb.innerHTML = ok
      ? `${t("correct", { n: gained })}<small>${full}</small>`
      : `${t(timeout ? "timeout" : "wrong", { answer })}<small>${full}</small>`;
  };

  const startTimer = () => {
    game.startTime = performance.now();
    const fill = $("#timer-fill");
    const text = $("#timer-text");
    const tick = () => {
      const elapsed = (performance.now() - game.startTime) / 1000;
      const left = Math.max(0, game.limit - elapsed);
      fill.style.width = (left / game.limit) * 100 + "%";
      const low = left <= Math.min(5, game.limit * 0.3);
      fill.classList.toggle("low", low);
      text.classList.toggle("low", low);
      text.textContent = Math.ceil(left);
      if (left <= 0) {
        clearInterval(game.timerId);
        resolve(false, null, true);
      }
    };
    tick();
    game.timerId = setInterval(tick, 100);
  };

  const answerChoice = (code) => {
    if (game.answered) return;
    const c = game.questions[game.index];
    resolve(code === c.code, null, false, code);
  };

  $("#answers-type").addEventListener("submit", (e) => {
    e.preventDefault();
    if (game.answered) { goNext(); return; }
    const val = $("#type-input").value.trim();
    if (!val) return;
    const c = game.questions[game.index];
    resolve(matches(val, acceptedOf(c)), val);
  });

  // typed – tekst wpisany przez gracza, pickedCode – kod wybranej opcji
  const resolve = (ok, typed, timeout = false, pickedCode = null) => {
    if (game.answered) return;
    game.answered = true;
    clearInterval(game.timerId);

    const c = game.questions[game.index];
    const elapsed = (performance.now() - game.startTime) / 1000;
    const left = Math.max(0, game.limit - elapsed);

    // Podświetlenie odpowiedzi
    $$("#answers-choice .choice").forEach((b) => {
      b.disabled = true;
      if (b.dataset.code === c.code) b.classList.add("correct");
      else if (b.dataset.code === pickedCode) b.classList.add("wrong");
    });
    const input = $("#type-input");
    input.disabled = true;
    input.className = ok ? "correct" : "wrong";

    let gained = 0;
    if (ok) {
      game.correct++;
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);
      // 100 pkt za trafienie + premia za szybkość (do 100 pkt) + premia za serię
      gained = 100 + Math.round((left / game.limit) * 100) + Math.min(game.streak - 1, 5) * 10;
      game.points += gained;
      beep(true);
    } else {
      game.streak = 0;
      game.mistakes.push({ c, mode: game.mode, typed, pickedCode, timeout });
      beep(false);
    }

    game.last = { ok, timeout, gained };
    renderQuestionTexts();
    $("#btn-next").hidden = false;
    // Po dobrej odpowiedzi przechodzimy automatycznie, po złej – czekamy, żeby można było zapamiętać
    if (ok) game.nextId = setTimeout(goNext, 1300);
  };

  const goNext = () => {
    if (!game.active || !game.answered) return;
    game.index++;
    nextQuestion();
  };

  $("#btn-next").addEventListener("click", goNext);
  $("#btn-quit").addEventListener("click", () => {
    if (confirm(t("confirmQuit"))) finishGame();
  });

  // Skróty klawiszowe: 1–4 wybór, Enter dalej
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-game").classList.contains("active")) return;
    if (settings.answerMode === "choice" && !game.answered && /^[1-4]$/.test(e.key)) {
      const btn = $$("#answers-choice .choice")[Number(e.key) - 1];
      if (btn) btn.click();
    } else if (e.key === "Enter" && game.answered && settings.answerMode === "choice") {
      goNext();
    }
  });

  const finishGame = () => {
    game.answeredCount = game.index + (game.answered ? 1 : 0);
    stopGame();

    // Rekord
    game.newRecord = false;
    const best = store.get("best", {});
    const prev = best[game.mode];
    if (game.answeredCount > 0 && (!prev || game.points > prev.points)) {
      best[game.mode] = { points: game.points, correct: game.correct, total: game.answeredCount };
      store.set("best", best);
      game.newRecord = true;
    }

    renderResult();
    show("result");
  };

  const renderResult = () => {
    const total = Math.max(game.answeredCount, 1);
    const pct = Math.round((game.correct / total) * 100);

    $("#result-big").textContent = `${game.correct} / ${game.answeredCount}`;
    $("#result-detail").innerHTML =
      t("resultDetail", { mode: t("mode_" + game.mode), pct, points: game.points, streak: game.bestStreak }) +
      (game.newRecord ? "<br>" + t("newRecord") : "");

    // Lista pomyłek
    $("#mistakes-title").hidden = game.mistakes.length === 0;
    $("#mistakes").innerHTML = game.mistakes
      .map(({ c, mode, typed, pickedCode, timeout }) => {
        let given = "—";
        if (timeout) given = t("noAnswer");
        else if (typed) given = typed;
        else if (pickedCode) {
          const p = COUNTRIES.find((x) => x.code === pickedCode);
          given = mode === "flag-capital" ? capitalOf(p) : nameOf(p);
        }
        return `
        <li>
          <img src="${flagUrl(c.code, 160)}" alt="">
          <div><b>${escapeHtml(nameOf(c))}</b> — ${escapeHtml(capitalOf(c))}<br><span class="your">${t("yourAnswer")}: ${escapeHtml(given)}</span></div>
        </li>`;
      })
      .join("");
  };

  $("#btn-again").addEventListener("click", () => startGame(game.mode));

  // Start
  applyStaticTexts();
  show("menu");
})();
