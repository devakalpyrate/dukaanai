/**
 * DukaanAI Auth Session & Language/Font Synchronization
 * ====================================================
 * 1. Synchronous startup handshake with `/api/auth/me`
 * 2. Instant syncing of database preferences (language, theme, shop info)
 * 3. Dynamic multilingual typography & font switching (Inter, Devanagari, Tamil, etc.)
 * 4. Fast, sleek splash loading state between login & dashboard
 */

(function () {
  // --- 1. Multilingual Typography Engine ---
  var langFontMap = {
    en: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    hi: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Segoe UI', sans-serif",
    mr: "'Noto Sans Devanagari', 'Nirmala UI', 'Segoe UI', sans-serif",
    bho: "'Noto Sans Devanagari', 'Nirmala UI', 'Segoe UI', sans-serif",
    awa: "'Noto Sans Devanagari', 'Nirmala UI', 'Segoe UI', sans-serif",
    ta: "'Noto Sans Tamil', 'Latha', 'Nirmala UI', sans-serif",
    te: "'Noto Sans Telugu', 'Gautami', 'Nirmala UI', sans-serif",
    or: "'Noto Sans Oriya', 'Kalinga', 'Nirmala UI', sans-serif",
    bn: "'Noto Sans Bengali', 'Vrinda', 'Nirmala UI', sans-serif",
    as: "'Noto Sans Bengali', 'Vrinda', 'Nirmala UI', sans-serif",
    gu: "'Noto Sans Gujarati', 'Shruti', 'Nirmala UI', sans-serif",
    kn: "'Noto Sans Kannada', 'Tunga', 'Nirmala UI', sans-serif",
    ml: "'Noto Sans Malayalam', 'Kartika', 'Nirmala UI', sans-serif",
    pa: "'Noto Sans Gurmukhi', 'Raavi', 'Nirmala UI', sans-serif",
  };

  window.applyLanguageFont = function (lang) {
    try {
      var targetLang =
        lang || localStorage.getItem("dukaanai_language") || "en";
      var font = langFontMap[targetLang] || langFontMap.en;
      document.documentElement.setAttribute("data-lang", targetLang);
      document.documentElement.style.setProperty("--app-font-family", font);
      if (document.body) {
        document.body.style.fontFamily = font;
      }
    } catch (e) {}
  };

  // --- 2. Ultra-Fast Sleek Loader Engine ---
  window.showDukaanFastLoader = function (msg) {
    var loader = document.getElementById("dukaan-app-fast-loader");
    if (!loader) return;
    var txt = document.getElementById("dukaan-loader-msg");
    if (txt && msg) txt.innerText = msg;
    loader.style.opacity = "1";
    loader.style.visibility = "visible";
    loader.style.pointerEvents = "auto";
  };

  window.hideDukaanFastLoader = function (delay) {
    var d = typeof delay === "number" ? delay : 350;
    setTimeout(function () {
      var loader = document.getElementById("dukaan-app-fast-loader");
      if (loader) {
        loader.style.opacity = "0";
        loader.style.pointerEvents = "none";
        setTimeout(function () {
          loader.style.visibility = "hidden";
        }, 300);
      }
    }, d);
  };

  // Listen to language change events from Settings
  window.addEventListener("dukaan_lang_change", function (e) {
    if (e && e.detail) {
      window.applyLanguageFont(e.detail);
    }
  });

  // Apply font immediately on script execution
  window.applyLanguageFont(localStorage.getItem("dukaanai_language") || "en");

  // --- 3. Instant Startup Handshake: Sync Database Settings Before React Renders ---
  var token = localStorage.getItem("dukaanai_token");
  if (token) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/auth/me", false); // Synchronous pre-flight before React loads
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send();

      if (xhr.status === 401 || xhr.status === 404) {
        // Account has been deleted or session expired
        localStorage.clear();
        sessionStorage.clear();
        if (
          window.location.pathname !== "/login" &&
          !window.location.pathname.startsWith("/docs")
        ) {
          window.location.href = "/login";
        }
      } else if (xhr.status === 200) {
        try {
          var meData = JSON.parse(xhr.responseText);
          if (meData && meData.settings) {
            var dbLang = meData.settings.language || "en";
            var dbTheme = meData.settings.theme || "dark";
            localStorage.setItem("dukaanai_language", dbLang);
            localStorage.setItem("dukaanai_theme", dbTheme);
            window.applyLanguageFont(dbLang);
          }
          if (meData && meData.shop) {
            var currUser = {};
            try {
              currUser = JSON.parse(
                localStorage.getItem("dukaanai_user") || "{}",
              );
            } catch (err) {}
            currUser.shop_id = meData.shop.id;
            currUser.shop_name = meData.shop.name;
            currUser.address = meData.shop.address;
            if (meData.user) {
              currUser.id = meData.user.id;
              currUser.name = meData.user.name;
              currUser.email = meData.user.email;
              currUser.phone = meData.user.phone;
            }
            localStorage.setItem("dukaanai_user", JSON.stringify(currUser));
          }
        } catch (parseErr) {}
      }
    } catch (e) {}
  }

  // --- 4. Global Fetch 401 Interceptor ---
  var origFetch = window.fetch;
  window.fetch = async function () {
    var res = await origFetch.apply(this, arguments);
    var url = arguments[0] ? String(arguments[0]) : "";
    if (
      res &&
      (res.status === 401 || res.status === 403) &&
      url.indexOf("/api/") !== -1 &&
      url.indexOf("/api/auth/login") === -1 &&
      url.indexOf("/api/auth/send-otp") === -1 &&
      url.indexOf("/api/auth/verify-otp") === -1 &&
      url.indexOf("/api/auth/reset-password") === -1 &&
      url.indexOf("/api/auth/restore-account") === -1
    ) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      if (
        window.location.pathname !== "/login" &&
        !window.location.pathname.startsWith("/docs")
      ) {
        window.location.href = "/login";
      }
    }
    return res;
  };

  // --- 5. Periodic Background Session Heartbeat (Every 10s & on Tab Focus) ---
  function checkSessionAlive() {
    var tk = localStorage.getItem("dukaanai_token");
    if (tk) {
      origFetch("/api/auth/me", {
        headers: {
          Authorization: "Bearer " + tk,
          "Content-Type": "application/json",
        },
      })
        .then(function (r) {
          if (r.status === 401 || r.status === 403) {
            localStorage.clear();
            sessionStorage.clear();
            if (
              window.location.pathname !== "/login" &&
              !window.location.pathname.startsWith("/docs")
            ) {
              window.location.href = "/login";
            }
          } else if (r.status === 200) {
            r.json()
              .then(function (d) {
                if (d && d.settings && d.settings.language) {
                  var cur = localStorage.getItem("dukaanai_language");
                  if (cur !== d.settings.language) {
                    localStorage.setItem(
                      "dukaanai_language",
                      d.settings.language,
                    );
                    window.applyLanguageFont(d.settings.language);
                  }
                }
              })
              .catch(function () {});
          }
        })
        .catch(function () {});
    }
  }

  setInterval(checkSessionAlive, 10000);
  window.addEventListener("focus", checkSessionAlive);

  // Hide initial loader once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.hideDukaanFastLoader(300);
    });
  } else {
    window.hideDukaanFastLoader(300);
  }
})();
