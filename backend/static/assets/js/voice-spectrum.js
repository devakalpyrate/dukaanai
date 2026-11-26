(function () {
  var linesCache = null;
  var lastQuery = 0;

  function animateSpectrum(now) {
    if (!linesCache || linesCache.length !== 36 || now - lastQuery > 1000) {
      var found = document.querySelectorAll('svg[viewBox="0 0 320 24"] line');
      if (found && found.length === 36) {
        linesCache = found;
      } else {
        linesCache = null;
      }
      lastQuery = now;
    }

    if (linesCache && linesCache.length === 36) {
      var vol = window.__dukaanLiveVol || 0;
      var isSpeaking = window.__dukaanIsSpeaking || false;

      if (isSpeaking && vol < 0.05) {
        var tWave = now * 0.006;
        vol = 0.3 + 0.18 * Math.sin(tWave) + 0.12 * Math.cos(tWave * 2.3);
        if (vol < 0.08) vol = 0.08;
      }

      var tSec = now * 0.001;
      var hasVoice = vol > 0.02;
      var freqData = window.__dukaanFreqData;

      for (var j = 0; j < 36; j++) {
        var line = linesCache[j];
        var color = j % 2 === 0 ? "#000000" : "#64748B";

        if (line.style.stroke !== color) {
          line.style.setProperty("stroke", color, "important");
          line.setAttribute("stroke", color);
          line.style.setProperty("stroke-width", "2.8px", "important");
          line.style.setProperty("stroke-linecap", "round", "important");
        }

        var norm = (j + 0.5) / 36;
        var bell = Math.sin(norm * Math.PI);
        var arch = 0.32 + 0.68 * bell;

        var wave1 = Math.sin(tSec * 7.5 + j * 0.42);
        var wave2 = Math.cos(tSec * 11.2 - j * 0.38);
        var wave3 = Math.sin(tSec * 16.8 + j * 0.65);
        var waveComposite = wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2;

        var freqBoost = 0;
        if (freqData && freqData.length > 0) {
          var binIdx = Math.floor(norm * Math.min(freqData.length - 1, 48));
          freqBoost = (freqData[binIdx] / 255) * 9.0;
        }

        var ambient = 1.6 + 1.2 * bell + waveComposite * 0.8;
        var voiceAmp =
          vol * 16 + freqBoost + (waveComposite + 1) * (vol * 7 + 2);
        var totalAmp = hasVoice ? ambient + voiceAmp : ambient;

        var h = Math.max(1.8, Math.min(10.6, totalAmp * arch));

        line.setAttribute("y1", (12 - h).toFixed(2));
        line.setAttribute("y2", (12 + h).toFixed(2));
      }
    }

    requestAnimationFrame(animateSpectrum);
  }

  requestAnimationFrame(animateSpectrum);
})();
