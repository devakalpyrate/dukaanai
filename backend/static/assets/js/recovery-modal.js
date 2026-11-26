(function () {
  let activeTab = "login";
  let forgotStep = 1;
  let verifiedIdentifier = "";
  let verifiedOtp = "";
  let maskedEmail = "";
  let resendCountdown = 0;
  let countdownTimer = null;

  function isAuthScreen() {
    if (localStorage.getItem("dukaanai_token")) {
      return false;
    }

    return !!document.getElementById("dukaan-auth-main");
  }

  function cleanupDashboardIfPresent() {
    if (!isAuthScreen()) {
      const bar = document.getElementById("dukaan-top-tabs-bar");
      if (bar) bar.remove();
      const recovery = document.getElementById(
        "dukaan-inplace-recovery-container",
      );
      if (recovery) recovery.remove();
      return true;
    }
    return false;
  }

  function getMainContainer() {
    if (!isAuthScreen()) return null;
    return document.getElementById("dukaan-auth-main");
  }

  function getLoginCardParent() {
    const main = getMainContainer();
    if (!main) return null;
    return main.querySelector('div[class*="max-w-md"]') || main;
  }

  function injectTopTabs() {
    if (cleanupDashboardIfPresent()) return;
    const main = getMainContainer();
    if (!main) return;

    const nativeTabs =
      document.getElementById("dukaan-native-tabs-bar") ||
      document.querySelector('div[class*="bg-[#1E1F26]"][class*="rounded-xl"]');
    if (nativeTabs && nativeTabs.id !== "dukaan-top-tabs-bar") {
      nativeTabs.style.display = "none";
    }

    const bottomLinks = document.querySelectorAll("span, a");
    bottomLinks.forEach((el) => {
      const txt = (el.innerText || "").trim().toLowerCase();
      if (
        txt.includes("forgot password") ||
        txt.includes("पासवर्ड भूल गए") ||
        txt.includes("restore store")
      ) {
        if (
          !el.closest("#dukaan-top-tabs-bar") &&
          !el.closest("#dukaan-inplace-recovery-container")
        ) {
          const row = el.closest('div[class*="flex"]');
          if (
            row &&
            (row.innerText.includes("Restore Store") ||
              row.innerText.includes("Forgot Password"))
          ) {
            row.style.display = "none";
          }
        }
      }
    });

    let topBar = document.getElementById("dukaan-top-tabs-bar");
    if (!topBar) {
      topBar = document.createElement("header");
      topBar.id = "dukaan-top-tabs-bar";
      topBar.style.cssText =
        "position: sticky; top: 0; left: 0; width: 100%; z-index: 50; background: #0E0F14; border-bottom: 1.5px solid #232530; margin: 0; padding: 0; box-sizing: border-box;";

      topBar.innerHTML = `
        <div style="width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); align-items: stretch; height: 50px; margin: 0; padding: 0; box-sizing: border-box; background: #0E0F14;">
          <button type="button" id="dukaan-top-tab-login" style="width: 100%; height: 100%; border: none; border-right: 1px solid #232530; cursor: pointer; font-size: 13px; font-weight: 700; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; align-items: center; justify-content: center; outline: none; border-bottom: 3px solid transparent; background: transparent; padding: 0 10px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Log In
          </button>
          <button type="button" id="dukaan-top-tab-register" style="width: 100%; height: 100%; border: none; border-right: 1px solid #232530; cursor: pointer; font-size: 13px; font-weight: 700; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; align-items: center; justify-content: center; outline: none; border-bottom: 3px solid transparent; background: transparent; padding: 0 10px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Register
          </button>
          <button type="button" id="dukaan-top-tab-forgot" style="width: 100%; height: 100%; border: none; border-right: 1px solid #232530; cursor: pointer; font-size: 13px; font-weight: 700; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; align-items: center; justify-content: center; outline: none; border-bottom: 3px solid transparent; background: transparent; padding: 0 10px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Forgot Password
          </button>
          <button type="button" id="dukaan-top-tab-restore" style="width: 100%; height: 100%; border: none; border-right: none; cursor: pointer; font-size: 13px; font-weight: 700; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; display: flex; align-items: center; justify-content: center; outline: none; border-bottom: 3px solid transparent; background: transparent; padding: 0 10px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Restore
          </button>
        </div>
      `;

      main.insertBefore(topBar, main.firstChild);

      document.getElementById("dukaan-top-tab-login").onclick = () =>
        switchTab("login");
      document.getElementById("dukaan-top-tab-register").onclick = () =>
        switchTab("register");
      document.getElementById("dukaan-top-tab-forgot").onclick = () =>
        switchTab("forgot");
      document.getElementById("dukaan-top-tab-restore").onclick = () =>
        switchTab("restore");
    }

    document.querySelectorAll("span, a, button").forEach((el) => {
      const text = (el.innerText || "").trim().toLowerCase();
      if (text === "register your store" || text === "register store") {
        if (!el.dataset.intercepted) {
          el.dataset.intercepted = "true";
          el.addEventListener("click", (e) => {
            e.preventDefault();
            switchTab("register");
          });
        }
      } else if (text === "log in" && el.id !== "dukaan-top-tab-login") {
        if (!el.dataset.intercepted && el.closest('div[class*="max-w-md"]')) {
          el.dataset.intercepted = "true";
          el.addEventListener("click", (e) => {
            if (activeTab !== "login") {
              e.preventDefault();
              switchTab("login");
            }
          });
        }
      }
    });

    updateTopTabsUI();
  }

  function updateTopTabsUI() {
    const btnLogin = document.getElementById("dukaan-top-tab-login");
    const btnReg = document.getElementById("dukaan-top-tab-register");
    const btnForgot = document.getElementById("dukaan-top-tab-forgot");
    const btnRestore = document.getElementById("dukaan-top-tab-restore");

    if (!btnLogin || !btnReg || !btnForgot || !btnRestore) return;

    const tabs = [
      { id: "login", el: btnLogin },
      { id: "register", el: btnReg },
      { id: "forgot", el: btnForgot },
      { id: "restore", el: btnRestore },
    ];

    tabs.forEach(({ id, el }) => {
      if (activeTab === id) {
        el.style.color = "#FFD026";
        el.style.borderBottom = "3px solid #FFD026";
        el.style.background = "rgba(255, 208, 38, 0.08)";
        el.style.fontWeight = "800";
      } else {
        el.style.color = "#A1A1AA";
        el.style.borderBottom = "3px solid transparent";
        el.style.background = "transparent";
        el.style.fontWeight = "600";
      }

      if (!el.dataset.hasHover) {
        el.dataset.hasHover = "true";
        el.addEventListener("mouseenter", () => {
          if (activeTab !== id) {
            el.style.background = "rgba(255, 255, 255, 0.035)";
            el.style.color = "#FFFFFF";
          }
        });
        el.addEventListener("mouseleave", () => {
          if (activeTab !== id) {
            el.style.background = "transparent";
            el.style.color = "#A1A1AA";
          }
        });
      }
    });
  }

  function switchTab(tab) {
    activeTab = tab;
    updateTopTabsUI();

    if (window.__dukaanClearReactError) {
      window.__dukaanClearReactError();
    }

    const parent = getLoginCardParent();
    if (!parent) return;

    const staleErrors = parent.querySelectorAll('div[class*="bg-rose-500"]');
    staleErrors.forEach((el) => {
      if (!el.closest("#dukaan-inplace-recovery-container")) {
        el.style.display = "none";
      }
    });

    const originalForms = parent.querySelectorAll(
      "form:not(#inplace-step1-form):not(#inplace-step2-form):not(#inplace-step3-form):not(#inplace-restore-form)",
    );
    const recoveryContainer = getOrCreateInPlaceContainer();

    if (tab === "login") {
      if (recoveryContainer) recoveryContainer.style.display = "none";
      originalForms.forEach((f) => (f.style.display = ""));

      if (window.__dukaanSetReactTab) {
        window.__dukaanSetReactTab("login");
      } else {
        const nativeButtons = document.querySelectorAll(
          '#dukaan-native-tabs-bar button, div[class*="bg-[#1E1F26]"] button',
        );
        if (nativeButtons[0]) nativeButtons[0].click();
      }
    } else if (tab === "register") {
      if (recoveryContainer) recoveryContainer.style.display = "none";
      originalForms.forEach((f) => (f.style.display = ""));

      if (window.__dukaanSetReactTab) {
        window.__dukaanSetReactTab("reg");
      } else {
        const nativeButtons = document.querySelectorAll(
          '#dukaan-native-tabs-bar button, div[class*="bg-[#1E1F26]"] button',
        );
        if (nativeButtons[1]) nativeButtons[1].click();
      }
    } else if (tab === "forgot") {
      originalForms.forEach((f) => (f.style.display = "none"));
      forgotStep = 1;
      renderForgotPasswordForm(recoveryContainer);
      if (recoveryContainer) recoveryContainer.style.display = "block";
    } else if (tab === "restore") {
      originalForms.forEach((f) => (f.style.display = "none"));
      renderRestoreAccountForm(recoveryContainer);
      if (recoveryContainer) recoveryContainer.style.display = "block";
    }
  }

  function getOrCreateInPlaceContainer() {
    let el = document.getElementById("dukaan-inplace-recovery-container");
    if (el) return el;

    const parent = getLoginCardParent();
    if (!parent) return null;

    el = document.createElement("div");
    el.id = "dukaan-inplace-recovery-container";
    el.style.display = "none";
    el.className = "w-full";
    parent.appendChild(el);
    return el;
  }

  function startCountdown(seconds, btnResend) {
    resendCountdown = seconds;
    if (countdownTimer) clearInterval(countdownTimer);
    if (btnResend) {
      btnResend.disabled = true;
      btnResend.innerText = `Resend in ${resendCountdown}s`;
    }
    countdownTimer = setInterval(() => {
      resendCountdown--;
      if (resendCountdown <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        if (btnResend) {
          btnResend.disabled = false;
          btnResend.innerText = "Resend Code";
        }
      } else if (btnResend) {
        btnResend.innerText = `Resend in ${resendCountdown}s`;
      }
    }, 1000);
  }

  function renderForgotPasswordForm(container) {
    if (!container) return;

    if (forgotStep === 1) {
      container.innerHTML = `
        <form id="inplace-step1-form" class="space-y-4">
          <div>
            <h2 class="text-xl font-black text-white tracking-tight">Forgot Password</h2>
            <p class="text-xs text-[#A1A1AA] mt-0.5">Enter your registered Phone Number or Email to receive an OTP.</p>
          </div>

          <div id="fp-err-box" style="display: none;" class="p-3 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium"></div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">Registered Mobile or Email</label>
            <input
              type="text"
              id="fp-identifier"
              required
              placeholder="e.g. 9876543210 or name@gmail.com"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] text-xs focus:outline-none focus:border-[#FFD026]"
            />
          </div>

          <button
            type="submit"
            id="fp-btn-send"
            class="w-full py-2.5 rounded-xl bg-[#FFD026] hover:bg-[#F6B511] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            Send Verification Code
          </button>
        </form>
      `;

      const form = document.getElementById("inplace-step1-form");
      const errBox = document.getElementById("fp-err-box");
      const btnSend = document.getElementById("fp-btn-send");
      const input = document.getElementById("fp-identifier");

      const loginUnified = document.querySelector(
        'input[placeholder*="mobile or email"]',
      );
      const loginMobile = document.querySelector('input[placeholder*="98765"]');
      const loginEmail = document.querySelector('input[placeholder*="@"]');
      if (loginUnified && loginUnified.value)
        input.value = loginUnified.value.trim();
      else if (loginMobile && loginMobile.value)
        input.value = loginMobile.value.trim();
      else if (loginEmail && loginEmail.value)
        input.value = loginEmail.value.trim();

      form.onsubmit = async (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) {
          showError(
            errBox,
            "Please enter your registered mobile number or email.",
          );
          return;
        }

        btnSend.disabled = true;
        btnSend.innerText = "Sending OTP...";
        errBox.style.display = "none";

        try {
          const isPhone = /^\d{10}$/.test(val.replace(/\D/g, ""));
          const payload = {
            identifier: val,
            phone: isPhone ? val.replace(/\D/g, "") : "",
            email: isPhone ? "" : val,
            action: "login",
          };

          const res = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(
              data.detail || data.error?.message || "Failed to send OTP.",
            );

          verifiedIdentifier = val;
          maskedEmail = data.masked_email || val;
          forgotStep = 2;
          renderForgotPasswordForm(container);
          window.showDukaanNotification &&
            window.showDukaanNotification({
              title: "OTP Sent",
              message: `Verification code sent to ${maskedEmail}.`,
              type: "success",
            });
        } catch (err) {
          showError(
            errBox,
            err.message ||
              "Failed to send verification code. Please check your details.",
          );
        } finally {
          btnSend.disabled = false;
          btnSend.innerText = "Send Verification Code";
        }
      };
    } else if (forgotStep === 2) {
      container.innerHTML = `
        <form id="inplace-step2-form" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black text-white tracking-tight">Confirm OTP</h2>
              <p class="text-xs text-[#A1A1AA] mt-0.5">Enter the 6-digit code sent to <strong class="text-white">${escapeHtml(maskedEmail)}</strong>.</p>
            </div>
            <button type="button" id="fp-step2-back" class="text-xs text-[#FFD026] hover:underline cursor-pointer">Change</button>
          </div>

          <div id="fp-err-box-2" style="display: none;" class="p-3 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium"></div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">6-Digit Code</label>
            <input
              type="text"
              id="fp-otp"
              required
              maxlength="6"
              placeholder="••••••"
              class="w-full text-center tracking-[0.3em] font-mono text-lg py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
            />
          </div>

          <div class="flex gap-2">
            <button
              type="submit"
              id="fp-btn-verify"
              class="flex-1 py-2.5 rounded-xl bg-[#FFD026] hover:bg-[#F6B511] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              Verify Code
            </button>
            <button
              type="button"
              id="fp-btn-resend"
              class="px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Resend Code
            </button>
          </div>
        </form>
      `;

      const form = document.getElementById("inplace-step2-form");
      const errBox = document.getElementById("fp-err-box-2");
      const btnVerify = document.getElementById("fp-btn-verify");
      const btnResend = document.getElementById("fp-btn-resend");
      const otpInput = document.getElementById("fp-otp");
      const btnBack = document.getElementById("fp-step2-back");

      startCountdown(20, btnResend);

      btnBack.onclick = () => {
        forgotStep = 1;
        renderForgotPasswordForm(container);
      };

      btnResend.onclick = async () => {
        if (resendCountdown > 0) return;
        btnResend.disabled = true;
        btnResend.innerText = "Sending...";
        try {
          const isPhone = /^\d{10}$/.test(
            verifiedIdentifier.replace(/\D/g, ""),
          );
          const res = await fetch("/api/auth/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: verifiedIdentifier,
              phone: isPhone ? verifiedIdentifier.replace(/\D/g, "") : "",
              email: isPhone ? "" : verifiedIdentifier,
              action: "login",
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "Failed to resend code.");
          startCountdown(25, btnResend);
          window.showDukaanNotification &&
            window.showDukaanNotification({
              title: "Code Resent",
              message: "A fresh verification code has been sent.",
              type: "success",
            });
        } catch (err) {
          showError(errBox, err.message || "Failed to resend code.");
          btnResend.disabled = false;
          btnResend.innerText = "Resend Code";
        }
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        const code = otpInput.value.trim().replace(/\D/g, "");
        if (code.length !== 6) {
          showError(
            errBox,
            "Please enter the complete 6-digit verification code.",
          );
          return;
        }

        btnVerify.disabled = true;
        btnVerify.innerText = "Verifying...";
        errBox.style.display = "none";

        try {
          const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: verifiedIdentifier, otp: code }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(
              data.detail ||
                data.error?.message ||
                "Invalid or expired verification code.",
            );

          verifiedOtp = code;

          forgotStep = 3;
          renderForgotPasswordForm(container);
          window.showDukaanNotification &&
            window.showDukaanNotification({
              title: "OTP Verified",
              message: "Code verified! Please create your new password.",
              type: "success",
            });
        } catch (err) {
          showError(
            errBox,
            err.message ||
              "Invalid verification code. Please check and try again.",
          );
        } finally {
          btnVerify.disabled = false;
          btnVerify.innerText = "Verify Code";
        }
      };
    } else if (forgotStep === 3) {
      container.innerHTML = `
        <form id="inplace-step3-form" class="space-y-4">
          <div>
            <h2 class="text-xl font-black text-white tracking-tight">Set New Password</h2>
            <p class="text-xs text-[#A1A1AA] mt-0.5">Enter and confirm your new secure password.</p>
          </div>

          <div id="fp-err-box-3" style="display: none;" class="p-3 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium"></div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">New Password</label>
            <div class="relative">
              <input
                type="password"
                id="fp-new-pass"
                required
                minlength="8"
                placeholder="Minimum 8 characters"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] text-xs focus:outline-none focus:border-[#FFD026]"
              />
              <button type="button" id="fp-toggle-pass" class="absolute right-3 top-2.5 text-[#71717A] hover:text-white text-xs">👁</button>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              id="fp-confirm-pass"
              required
              minlength="8"
              placeholder="Re-enter your new password"
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] text-xs focus:outline-none focus:border-[#FFD026]"
            />
          </div>

          <button
            type="submit"
            id="fp-btn-save"
            class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            Save New Password
          </button>
        </form>
      `;

      const form = document.getElementById("inplace-step3-form");
      const errBox = document.getElementById("fp-err-box-3");
      const btnSave = document.getElementById("fp-btn-save");
      const passInput = document.getElementById("fp-new-pass");
      const confirmInput = document.getElementById("fp-confirm-pass");
      const btnToggle = document.getElementById("fp-toggle-pass");

      btnToggle.onclick = () => {
        const isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        confirmInput.type = isPass ? "text" : "password";
        btnToggle.innerText = isPass ? "🙈" : "👁";
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        const p1 = passInput.value;
        const p2 = confirmInput.value;

        if (p1.length < 8) {
          showError(errBox, "Password must be at least 8 characters long.");
          return;
        }
        if (p1 !== p2) {
          showError(errBox, "Passwords do not match. Please verify.");
          return;
        }

        btnSave.disabled = true;
        btnSave.innerText = "Saving Password...";
        errBox.style.display = "none";

        try {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identifier: verifiedIdentifier,
              otp: verifiedOtp,
              new_password: p1,
            }),
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(
              data.detail || data.error?.message || "Failed to reset password.",
            );

          verifiedOtp = "";
          forgotStep = 1;

          window.showDukaanNotification &&
            window.showDukaanNotification({
              title: "Password Updated",
              message: "Your new password is saved! Please log in.",
              type: "success",
            });

          switchTab("login");
          setTimeout(() => {
            const loginInputs = document.querySelectorAll(
              'input[placeholder*="98765"], input[placeholder*="@"], input[placeholder*="mobile"], input[placeholder*="email"]',
            );
            if (loginInputs[0] && verifiedIdentifier) {
              loginInputs[0].value = verifiedIdentifier;
              loginInputs[0].dispatchEvent(
                new Event("input", { bubbles: true }),
              );
            }
          }, 100);
        } catch (err) {
          showError(
            errBox,
            err.message || "Failed to update password. Please try again.",
          );
        } finally {
          btnSave.disabled = false;
          btnSave.innerText = "Save New Password";
        }
      };
    }
  }

  function renderRestoreAccountForm(container) {
    if (!container) return;

    container.innerHTML = `
      <form id="inplace-restore-form" class="space-y-4">
        <div>
          <h2 class="text-xl font-black text-white tracking-tight">Restore Store</h2>
          <p class="text-xs text-[#A1A1AA] mt-0.5">Restore your deleted DukaanAI store & ledger history.</p>
        </div>

        <div id="rest-err-box" style="display: none;" class="p-3 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium"></div>

        <div class="space-y-1">
          <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">Store Mobile or Email</label>
          <input
            type="text"
            id="rest-identifier"
            required
            placeholder="e.g. 9876543210 or store@gmail.com"
            class="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] text-xs focus:outline-none focus:border-[#FFD026]"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">Account Password</label>
          <input
            type="password"
            id="rest-password"
            required
            placeholder="Enter your store password"
            class="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] text-xs focus:outline-none focus:border-[#FFD026]"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">6-Digit OTP</label>
            <button type="button" id="rest-btn-otp" class="text-[11px] font-bold text-[#FFD026] hover:underline cursor-pointer">Send OTP</button>
          </div>
          <input
            type="text"
            id="rest-otp"
            required
            maxlength="6"
            placeholder="••••••"
            class="w-full text-center tracking-[0.3em] font-mono text-base py-2 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
          />
        </div>

        <button
          type="submit"
          id="rest-btn-submit"
          class="w-full py-2.5 rounded-xl bg-[#FFD026] hover:bg-[#F6B511] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          Restore Store & Log In
        </button>
      </form>
    `;

    const form = document.getElementById("inplace-restore-form");
    const errBox = document.getElementById("rest-err-box");
    const btnSubmit = document.getElementById("rest-btn-submit");
    const btnOtp = document.getElementById("rest-btn-otp");
    const idInput = document.getElementById("rest-identifier");
    const passInput = document.getElementById("rest-password");
    const otpInput = document.getElementById("rest-otp");

    btnOtp.onclick = async () => {
      const val = idInput.value.trim();
      if (!val) {
        showError(errBox, "Please enter your mobile number or email first.");
        return;
      }
      btnOtp.disabled = true;
      btnOtp.innerText = "Sending...";
      errBox.style.display = "none";
      try {
        const isPhone = /^\d{10}$/.test(val.replace(/\D/g, ""));
        const payload = {
          identifier: val,
          phone: isPhone ? val.replace(/\D/g, "") : "",
          email: isPhone ? "" : val,
          action: "restore",
        };

        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to send OTP.");
        btnOtp.innerText = "OTP Sent!";
        window.showDukaanNotification &&
          window.showDukaanNotification({
            title: "OTP Sent",
            message: `Verification code sent to ${data.masked_email || val}.`,
            type: "success",
          });
      } catch (err) {
        showError(errBox, err.message || "Failed to send verification code.");
        btnOtp.disabled = false;
        btnOtp.innerText = "Send OTP";
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const identifier = idInput.value.trim();
      const password = passInput.value;
      const otp = otpInput.value.trim().replace(/\D/g, "");

      if (!identifier || !password || otp.length !== 6) {
        showError(
          errBox,
          "Please fill in all fields including the 6-digit OTP.",
        );
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerText = "Restoring Store...";
      errBox.style.display = "none";

      try {
        const res = await fetch("/api/auth/restore-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password, otp }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.detail ||
              data.error?.message ||
              "Restore failed. Please check credentials.",
          );

        window.showDukaanNotification &&
          window.showDukaanNotification({
            title: "Store Restored",
            message:
              "Account and ledger restored successfully! Logging you in...",
            type: "success",
          });

        if (data.access_token) {
          localStorage.setItem("dukaanai_token", data.access_token);
          if (data.language)
            localStorage.setItem("dukaanai_language", data.language);
          if (data.theme) localStorage.setItem("dukaanai_theme", data.theme);
          if (window.applyLanguageFont)
            window.applyLanguageFont(data.language || "en");
          if (window.showDukaanFastLoader)
            window.showDukaanFastLoader("Restoring store data...");
          if (data.shop_name) {
            localStorage.setItem(
              "dukaanai_user",
              JSON.stringify({
                id: data.user_id,
                name: data.name,
                email: data.email,
                phone: data.phone || "",
                shop_id: data.shop_id,
                shop_name: data.shop_name,
                address: data.shop_address || "",
              }),
            );
          }
        }
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } catch (err) {
        showError(
          errBox,
          err.message ||
            "Restoration failed. Ensure account was deleted within 30 days.",
        );
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Restore Store & Log In";
      }
    };
  }

  function showError(box, msg) {
    if (!box) return;
    box.innerText = msg;
    box.style.display = "block";
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Continuously ensure top tabs are mounted at the top of <main> without flickering
  setInterval(injectTopTabs, 400);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectTopTabs);
  } else {
    injectTopTabs();
  }
})();
