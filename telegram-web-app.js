/* Минимальная совместимая заготовка Telegram.WebApp (НЕ оригинальный файл Telegram).
   Реализует только то, что нужно приложению: ready, expand, close, openLink,
   openTelegramLink, setHeaderColor, setBackgroundColor, initData, themeParams.
   Замените на оригинальный telegram-web-app.js, когда сможете его скачать. */
(function () {
  var w = window;
  if (w.Telegram && w.Telegram.WebApp) return;

  function parseParams(str) {
    var out = {};
    str = (str || "").replace(/^[#?]/, "");
    if (!str) return out;
    str.split("&").forEach(function (p) {
      var i = p.indexOf("=");
      var k = decodeURIComponent(i < 0 ? p : p.slice(0, i));
      var v = i < 0 ? "" : decodeURIComponent(p.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
    return out;
  }

  var params = parseParams(location.hash);
  var q = parseParams(location.search);
  for (var k in q) if (!(k in params)) params[k] = q[k];

  var inTG = ("tgWebAppData" in params) || ("tgWebAppVersion" in params) ||
    !!w.TelegramWebviewProxy ||
    !!(w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers.performAction);

  var handlers = {};

  function postEvent(name, data) {
    data = data || {};
    try {
      if (w.TelegramWebviewProxy && w.TelegramWebviewProxy.postEvent) {
        w.TelegramWebviewProxy.postEvent(name, JSON.stringify(data));
      } else if (w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers.performAction) {
        w.webkit.messageHandlers.performAction.postMessage({ eventType: name, eventData: data });
      } else if (w.parent && w.parent !== w) {
        w.parent.postMessage(JSON.stringify({ eventType: name, eventData: data }), "*");
      }
    } catch (e) {}
  }

  function receiveEvent(type, data) {
    (handlers[type] || []).slice().forEach(function (fn) {
      try { fn(data); } catch (e) {}
    });
  }

  w.Telegram = w.Telegram || {};
  w.Telegram.WebView = { postEvent: postEvent, receiveEvent: receiveEvent, initParams: params, isIframe: w.parent !== w };
  w.TelegramGameProxy_receiveEvent = receiveEvent;

  var themeParams = {};
  try { themeParams = JSON.parse(params.tgWebAppThemeParams || "{}"); } catch (e) {}

  var initData = params.tgWebAppData || "";
  var initDataUnsafe = {};
  if (initData) {
    var d = parseParams(initData);
    for (var key in d) {
      if (key === "user" || key === "receiver" || key === "chat") {
        try { initDataUnsafe[key] = JSON.parse(d[key]); } catch (e) {}
      } else {
        initDataUnsafe[key] = d[key];
      }
    }
  }

  var WebApp = {
    initData: initData,
    initDataUnsafe: initDataUnsafe,
    version: params.tgWebAppVersion || "6.0",
    platform: params.tgWebAppPlatform || "unknown",
    colorScheme: (themeParams.bg_color && /^#?[0-7]/.test(themeParams.bg_color)) ? "dark" : "light",
    themeParams: themeParams,
    isExpanded: false,
    headerColor: "#ffffff",
    backgroundColor: "#ffffff",

    ready: function () { postEvent("web_app_ready"); },
    expand: function () { WebApp.isExpanded = true; postEvent("web_app_expand"); },
    close: function () { postEvent("web_app_close"); },

    setHeaderColor: function (color) {
      WebApp.headerColor = color;
      if (/^#[0-9a-f]{6}$/i.test(color)) postEvent("web_app_set_header_color", { color: color });
      else postEvent("web_app_set_header_color", { color_key: color });
    },
    setBackgroundColor: function (color) {
      WebApp.backgroundColor = color;
      postEvent("web_app_set_background_color", { color: color });
    },

    openLink: function (url) {
      postEvent("web_app_open_link", { url: url });
    },
    openTelegramLink: function (url) {
      var m = /^https:\/\/t\.me(\/.*)?$/i.exec(url || "");
      if (!m) throw new Error("Url " + url + " is not valid");
      postEvent("web_app_open_tg_link", { path_full: m[1] || "/" });
    },

    onEvent: function (type, fn) {
      (handlers[type] = handlers[type] || []).push(fn);
    },
    offEvent: function (type, fn) {
      var list = handlers[type] || [];
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    isVersionAtLeast: function (v) {
      var a = String(WebApp.version).split("."), b = String(v).split(".");
      for (var i = 0; i < Math.max(a.length, b.length); i++) {
        var x = +a[i] || 0, y = +b[i] || 0;
        if (x !== y) return x > y;
      }
      return true;
    }
  };

  w.Telegram.WebApp = WebApp;

  if (inTG) {
    postEvent("web_app_request_theme");
    postEvent("web_app_request_viewport");
  }
})();
