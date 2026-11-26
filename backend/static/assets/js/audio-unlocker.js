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

  window.__dukaanBlobToWav = async function (rawBlob) {
    try {
      if (!rawBlob || rawBlob.size === 0) return rawBlob;
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return rawBlob;

      var arrayBuffer = await rawBlob.arrayBuffer();
      var tempCtx = new AudioCtx();
      var audioBuffer;
      try {
        audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      } finally {
        try {
          if (tempCtx.state !== "closed") await tempCtx.close();
        } catch (e) {}
      }

      if (!audioBuffer) return rawBlob;

      var targetSampleRate = 16000;
      var OfflineCtx =
        window.OfflineAudioContext || window.webkitOfflineAudioContext;
      var channelData;

      if (OfflineCtx) {
        var numFrames = Math.max(
          1,
          Math.ceil(audioBuffer.duration * targetSampleRate),
        );
        var offlineCtx = new OfflineCtx(1, numFrames, targetSampleRate);
        var src = offlineCtx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(offlineCtx.destination);
        src.start(0);
        var resampled = await offlineCtx.startRendering();
        channelData = resampled.getChannelData(0);
      } else {
        channelData = audioBuffer.getChannelData(0);
      }

      var numSamples = channelData.length;
      var wavBuf = new ArrayBuffer(44 + numSamples * 2);
      var view = new DataView(wavBuf);

      function writeStr(offset, str) {
        for (var i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }

      writeStr(0, "RIFF");
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, targetSampleRate, true);
      view.setUint32(28, targetSampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, "data");
      view.setUint32(40, numSamples * 2, true);

      var offset = 44;
      for (var i = 0; i < numSamples; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }

      return new Blob([view], { type: "audio/wav" });
    } catch (err) {
      console.warn("DukaanAI: Client audio WAV conversion fallback:", err);
      return rawBlob;
    }
  };
})();
