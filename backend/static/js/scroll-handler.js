(function () {
        var scrollTimeoutMap = new WeakMap();
        function markScrolling(el) {
          if (!el || !el.classList) return;
          el.classList.add("is-scrolling");
          var timer = scrollTimeoutMap.get(el);
          if (timer) clearTimeout(timer);
          scrollTimeoutMap.set(
            el,
            setTimeout(function () {
              el.classList.remove("is-scrolling");
            }, 800),
          );
        }
        function handleScrollEvent(e) {
          var t = e.target;
          var el =
            t === document || t === window
              ? document.documentElement || document.body
              : t;
          markScrolling(el);
          if ((e.type === "wheel" || e.type === "touchmove") && el) {
            var p = el;
            while (p && p !== document.body && p !== document.documentElement) {
              if (
                p.scrollHeight > p.clientHeight ||
                p.scrollWidth > p.clientWidth
              ) {
                markScrolling(p);
                break;
              }
              p = p.parentElement;
            }
          }
        }
        window.addEventListener("scroll", handleScrollEvent, {
          capture: true,
          passive: true,
        });
        window.addEventListener("wheel", handleScrollEvent, {
          capture: true,
          passive: true,
        });
        window.addEventListener("touchmove", handleScrollEvent, {
          capture: true,
          passive: true,
        });
      })();
