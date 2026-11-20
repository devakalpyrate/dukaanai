(function () {
        window.__dukaanUnlockAudio = function () {
          try {
            if (!window.__dukaanSharedAudio) {
              window.__dukaanSharedAudio = new Audio();
            }
            if (!window.__dukaanAudioUnlocked) {
              window.__dukaanSharedAudio.src =
                "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
              var p = window.__dukaanSharedAudio.play();
              if (p && typeof p.then === "function") {
                p.then(function () {
                  window.__dukaanAudioUnlocked = true;
                }).catch(function () {});
              }
            }
            if (window.speechSynthesis && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch (e) {}
        };

        window.addEventListener("pointerdown", window.__dukaanUnlockAudio, {
          capture: true,
          passive: true,
        });
        window.addEventListener("touchstart", window.__dukaanUnlockAudio, {
          capture: true,
          passive: true,
        });
        window.addEventListener("click", window.__dukaanUnlockAudio, {
          capture: true,
          passive: true,
        });
        window.addEventListener("keydown", window.__dukaanUnlockAudio, {
          capture: true,
          passive: true,
        });
      })();
