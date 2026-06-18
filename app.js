(function () {
  "use strict";

  const STORAGE_KEY = "dlt.entries.v1";

  /** @typedef {{ id: string, text: string, ts: number, day: string }} Entry */

  /** @returns {Entry[]} */
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Failed to read saved entries:", err);
      return [];
    }
  }

  /** @param {Entry[]} list */
  function saveEntries(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to save entries:", err);
    }
  }

  /** Local date key in YYYY-MM-DD (no timezone surprises). */
  function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /** Consecutive days with at least one entry, counting back from today (or yesterday). */
  function calculateStreak(list) {
    if (list.length === 0) return 0;
    const days = new Set(list.map((e) => e.day));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!days.has(dayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(dayKey(cursor))) return 0;
    }

    let streak = 0;
    while (days.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function uniqueDays(list) {
    return new Set(list.map((e) => e.day)).size;
  }

  function formatWhen(ts) {
    const d = new Date(ts);
    const date = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${date} · ${time}`;
  }

  const els = {
    streak: document.getElementById("stat-streak"),
    count: document.getElementById("stat-count"),
    days: document.getElementById("stat-days"),
    form: document.getElementById("log-form"),
    input: document.getElementById("log-input"),
    list: document.getElementById("entry-list"),
    empty: document.getElementById("empty-state"),
  };

  /** @type {Entry[]} */
  let entries = loadEntries();

  function render() {
    els.streak.textContent = String(calculateStreak(entries));
    els.count.textContent = String(entries.length);
    els.days.textContent = String(uniqueDays(entries));

    els.list.innerHTML = "";
    const sorted = entries.slice().sort((a, b) => b.ts - a.ts);
    els.empty.hidden = sorted.length > 0;

    for (const entry of sorted) {
      const li = document.createElement("li");
      li.className = "entry";

      const body = document.createElement("div");
      body.className = "entry__body";

      const text = document.createElement("p");
      text.className = "entry__text";
      text.textContent = entry.text; // textContent prevents HTML/script injection

      const when = document.createElement("time");
      when.className = "entry__when";
      when.dateTime = new Date(entry.ts).toISOString();
      when.textContent = formatWhen(entry.ts);

      body.appendChild(text);
      body.appendChild(when);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "entry__delete";
      del.setAttribute("aria-label", "Delete this entry");
      del.textContent = "×";
      del.addEventListener("click", () => removeEntry(entry.id));

      li.appendChild(body);
      li.appendChild(del);
      els.list.appendChild(li);
    }
  }

  function addEntry(rawText) {
    const text = rawText.trim();
    if (!text) return;
    const now = new Date();
    entries.push({ id: uid(), text, ts: now.getTime(), day: dayKey(now) });
    saveEntries(entries);
    render();
  }

  function removeEntry(id) {
    entries = entries.filter((e) => e.id !== id);
    saveEntries(entries);
    render();
  }

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    addEntry(els.input.value);
    els.input.value = "";
    els.input.focus();
  });

  els.input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      els.form.requestSubmit();
    }
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .catch((err) => console.warn("Service worker registration failed:", err));
    });
  }
})();
