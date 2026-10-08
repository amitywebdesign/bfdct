// Bethany Fire: progressive enhancement only. The site works without this file.
(function () {
  "use strict";

  // localStorage can throw (private windows, blocked storage): never depend on it.
  function store(op, key, value) {
    try {
      if (op === "get") return window.localStorage.getItem(key);
      if (op === "set") window.localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
    return null;
  }

  // ---- Mobile menu ---------------------------------------------------------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // ---- Site alert: honor expiry between rebuilds, remember dismissal -------
  var alertEl = document.querySelector("[data-alert]");
  if (alertEl) {
    var expires = alertEl.getAttribute("data-expires");
    var alertId = "bf-alert-" + alertEl.getAttribute("data-alert-id");
    if (expires && new Date(expires + "T23:59:59") < new Date()) {
      alertEl.hidden = true;
    } else if (store("get", alertId) === "1") {
      alertEl.hidden = true;
    }
    var close = alertEl.querySelector("[data-alert-close]");
    if (close) {
      close.addEventListener("click", function () {
        alertEl.hidden = true;
        store("set", alertId, "1");
      });
    }
  }

  // ---- Featured event: show the first one that has not ended ---------------
  var featured = Array.prototype.slice.call(document.querySelectorAll("[data-featured-event]"));
  if (featured.length) {
    var now = new Date();
    var shown = false;
    featured.forEach(function (el) {
      var end = el.getAttribute("data-expires");
      var over = end && new Date(end) < now;
      if (!over && !shown) { el.hidden = false; shown = true; }
      else { el.hidden = true; }
    });
  }

  // ---- Forms ---------------------------------------------------------------
  function say(status, kind, msg) {
    if (!status) return;
    status.hidden = false;
    status.className = "form__status form__status--" + kind;
    status.textContent = msg;
  }

  // Preselect the topic on the contact form from ?topic=billing
  var params = new URLSearchParams(window.location.search);
  var wanted = params.get("topic");
  if (wanted) {
    var topic = document.querySelector('select[name="topic"]');
    if (topic) {
      Array.prototype.forEach.call(topic.options, function (o) { if (o.value === wanted) topic.value = wanted; });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("form[data-form]"), function (form) {
    form.addEventListener("submit", function (e) {
      var endpoint = form.getAttribute("data-endpoint");
      var status = form.querySelector(".form__status");
      var phone = form.getAttribute("data-phone") || "";

      if (!endpoint) {
        e.preventDefault();
        say(status, "err", "This form isn't connected yet, so nothing was sent. Please call " + phone + " or come see us on Tuesday at 7pm.");
        return;
      }
      var trap = form.querySelector('input[name="_gotcha"]');
      e.preventDefault();
      if (trap && trap.value) { say(status, "ok", "Thank you! We got your message."); return; } // bots

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; }
      say(status, "ok", "Sending...");
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("bad status");
          form.reset();
          say(status, "ok", "Thank you! We got your message and will get back to you.");
        })
        .catch(function () {
          say(status, "err", "Sorry, that didn't go through. Please try again, or call " + phone + ".");
        })
        .then(function () { if (btn) btn.disabled = false; });
    });
  });

  // ---- Video: load the player only when asked (no tracking until click) ----
  Array.prototype.forEach.call(document.querySelectorAll("[data-youtube-id]"), function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-youtube-id");
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
      f.title = btn.getAttribute("data-title") || "Video";
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      btn.replaceWith(f);
    });
  });
})();
