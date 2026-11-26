(function () {
  var container = document.getElementById("dukaan-windows-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "dukaan-windows-toast-container";
    document.body.appendChild(container);
  }

  var ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  var recentMessages = new Map();

  window.showDukaanNotification = function (opts) {
    if (!opts) return;
    var title =
      opts.title || (opts.type === "error" ? "Error" : "Notification");
    var message = opts.message || opts.text || "";

    // Strictly suppress internal system OTP and auth debug messages
    if (
      opts.type === "system_otp" ||
      opts.type === "auth_event" ||
      title === "system_otp" ||
      (typeof message === "string" &&
        (message.indexOf('"keys"') !== -1 || message.indexOf('"code"') !== -1))
    ) {
      return;
    }

    var type = opts.type && ICONS[opts.type] ? opts.type : "success";
    var duration = typeof opts.duration === "number" ? opts.duration : 4000;

    if (!message && !title) return;

    var dedupeKey = title + "::" + message;
    var now = Date.now();
    if (
      recentMessages.has(dedupeKey) &&
      now - recentMessages.get(dedupeKey) < 1500
    ) {
      return;
    }
    recentMessages.set(dedupeKey, now);

    var toast = document.createElement("div");
    toast.className = "win11-toast";
    toast.setAttribute("role", "alert");

    var iconSvg = ICONS[type] || ICONS.success;
    var progressClass = "win11-progress-" + type;

    toast.innerHTML =
      '<div class="win11-toast-header">' +
      '<div class="win11-header-left">' +
      '<div class="win11-app-badge">D</div>' +
      '<span class="win11-app-name">DukaanAI</span>' +
      '<span class="win11-dot">•</span>' +
      '<span class="win11-header-tag">Just now</span>' +
      "</div>" +
      '<button type="button" class="win11-close-btn" aria-label="Dismiss Notification" title="Dismiss">✕</button>' +
      "</div>" +
      '<div class="win11-toast-body">' +
      '<div class="win11-status-icon win11-icon-' +
      type +
      '">' +
      iconSvg +
      "</div>" +
      '<div class="win11-text-block">' +
      '<div class="win11-title">' +
      title +
      "</div>" +
      '<div class="win11-desc">' +
      message +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="win11-progress-track">' +
      '<div class="win11-progress-bar ' +
      progressClass +
      '"></div>' +
      "</div>";

    var progressBar = toast.querySelector(".win11-progress-bar");
    var closeBtn = toast.querySelector(".win11-close-btn");

    var remaining = duration;
    var start = Date.now();
    var timerId = null;
    var isDismissing = false;

    function dismiss() {
      if (isDismissing) return;
      isDismissing = true;
      if (timerId) clearTimeout(timerId);
      toast.classList.add("win-toast-dismissing");
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 280);
    }

    function startCountdown() {
      start = Date.now();
      if (progressBar) {
        progressBar.style.transition = "width " + remaining + "ms linear";
        progressBar.style.width = "0%";
      }
      timerId = setTimeout(dismiss, remaining);
    }

    function pauseCountdown() {
      if (timerId) clearTimeout(timerId);
      if (progressBar) {
        var elapsed = Date.now() - start;
        remaining = Math.max(200, remaining - elapsed);
        var currentPercent = (remaining / duration) * 100;
        progressBar.style.transition = "none";
        progressBar.style.width = currentPercent + "%";
      }
    }

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dismiss();
    });

    toast.addEventListener("mouseenter", pauseCountdown);
    toast.addEventListener("mouseleave", function () {
      if (!isDismissing) startCountdown();
    });

    container.appendChild(toast);
    while (container.children.length > 4) {
      container.removeChild(container.firstChild);
    }

    setTimeout(function () {
      if (!isDismissing) startCountdown();
    }, 30);
  };

  window.addEventListener("dukaan:notify", function (e) {
    if (e && e.detail) {
      window.showDukaanNotification(e.detail);
    }
  });

  window.addEventListener("dukaanai:data_updated", function (e) {
    if (e && e.detail) {
      var d = e.detail;
      var msg = d.message || d.spoken_message || "";
      if (msg && !d.clarification_needed) {
        window.showDukaanNotification({
          title: "DukaanAI Action",
          message: msg,
          type: "success",
        });
      }
    }
  });

  // Banner observer removed to prevent intrusive sliding notifications on forms & login screens

  function setNativeValue(element, value) {
    try {
      var valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
      var prototype = Object.getPrototypeOf(element);
      var prototypeValueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value",
      )?.set;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (err) {
      element.value = value;
    }
  }

  function checkOtpInputs() {
    var otpInputs = document.querySelectorAll(
      'input[placeholder*="6-digit code"], input[placeholder*="Enter 6-digit"]',
    );
    for (var i = 0; i < otpInputs.length; i++) {
      var inp = otpInputs[i];
      inp.setAttribute("autocomplete", "one-time-code");
      if (!inp.dataset.pasteEnhanced) {
        inp.dataset.pasteEnhanced = "true";

        var urlOtp = new URLSearchParams(window.location.search).get("otp");
        if (urlOtp && urlOtp.replace(/\D/g, "").length === 6) {
          setNativeValue(inp, urlOtp.replace(/\D/g, "").slice(0, 6));
        }

        var label = inp.previousElementSibling;
        if (
          label &&
          label.tagName === "LABEL" &&
          !label.querySelector(".otp-paste-btn")
        ) {
          label.style.display = "flex";
          label.style.justifyContent = "space-between";
          label.style.alignItems = "center";
          var pasteBtn = document.createElement("button");
          pasteBtn.type = "button";
          pasteBtn.className = "otp-paste-btn";
          pasteBtn.innerText = "📋 Paste Code";
          pasteBtn.style.cssText =
            "font-size: 11px; font-weight: 700; color: #FFD026; background: rgba(255, 208, 38, 0.12); border: 1px solid rgba(255, 208, 38, 0.35); border-radius: 6px; padding: 2px 8px; cursor: pointer; text-transform: none; letter-spacing: normal; transition: all 0.15s ease;";
          pasteBtn.onmouseover = function () {
            this.style.background = "rgba(255, 208, 38, 0.25)";
          };
          pasteBtn.onmouseout = function () {
            this.style.background = "rgba(255, 208, 38, 0.12)";
          };
          pasteBtn.onclick = (function (targetInp) {
            return function (e) {
              e.preventDefault();
              if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard
                  .readText()
                  .then(function (clipText) {
                    var digits = (clipText || "")
                      .replace(/\D/g, "")
                      .slice(0, 6);
                    if (digits && digits.length === 6) {
                      setNativeValue(targetInp, digits);
                      window.showDukaanNotification &&
                        window.showDukaanNotification({
                          title: "Code Pasted",
                          message: "Filled verification code " + digits,
                          type: "success",
                        });
                    } else {
                      window.showDukaanNotification &&
                        window.showDukaanNotification({
                          title: "Clipboard",
                          message: "No 6-digit code found in clipboard.",
                          type: "warning",
                        });
                    }
                  })
                  .catch(function () {
                    targetInp.focus();
                  });
              } else {
                targetInp.focus();
              }
            };
          })(inp);
          label.appendChild(pasteBtn);
        }
      }
    }
  }

  if (document.body) {
    setInterval(checkOtpInputs, 500);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      setInterval(checkOtpInputs, 500);
    });
  }
})();
