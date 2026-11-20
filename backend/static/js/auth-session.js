(function () {
        // 1. Instant Startup Handshake: Check if account exists in database before rendering
        var token = localStorage.getItem("dukaanai_token");
        if (token) {
          try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/auth/me", false); // Synchronous pre-flight before React loads
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send();
            if (xhr.status === 401 || xhr.status === 404) {
              // Account has been deleted from Supabase or session expired!
              localStorage.clear();
              sessionStorage.clear();
              if (
                window.location.pathname !== "/login" &&
                !window.location.pathname.startsWith("/docs")
              ) {
                window.location.href = "/login";
              }
            }
          } catch (e) {}
        }

        // 2. Global Fetch 401 Interceptor: Catches any unauthorized API response
        var origFetch = window.fetch;
        window.fetch = async function () {
          var res = await origFetch.apply(this, arguments);
          var url = arguments[0] ? String(arguments[0]) : "";
          if (
            res &&
            (res.status === 401 || res.status === 403) &&
            url.indexOf("/api/") !== -1 &&
            url.indexOf("/api/auth/login") === -1 &&
            url.indexOf("/api/auth/send-otp") === -1
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

        // 3. Periodic Background Session Heartbeat (Every 5s & on Tab Focus)
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
                }
              })
              .catch(function () {});
          }
        }
        setInterval(checkSessionAlive, 5000);
        window.addEventListener("focus", checkSessionAlive);
      })();
