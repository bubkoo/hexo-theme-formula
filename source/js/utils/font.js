// ref
//   - http://jaicab.com/2015/03/03/introducing-localfont-a-localstorage-solution/

(function () {
    "use strict";
    function addEvent(e, t, n) {
        e.addEventListener
            ? e.addEventListener(t, n, !1)
            : e.attachEvent && e.attachEvent("on" + t, n)
    }

    function isMatch(font) {
        return window.localStorage &&
            localStorage.font_css_cache &&
            localStorage.font_css_cache_file === font
    }

    function loadCache() {
        if (window.localStorage && window.XMLHttpRequest) {
            if (isMatch(fontPath)) {
                appendStyle(localStorage.font_css_cache);
            } else {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", fontPath, !0);
                addEvent(xhr, "load", function () {
                    if (4 === xhr.readyState) {
                        appendStyle(xhr.responseText);
                        localStorage.font_css_cache = xhr.responseText;
                        localStorage.font_css_cache_file = fontPath;
                    }
                });
                xhr.send();
            }
        } else {
            var link = document.createElement("link");
            link.href = fontPath;
            link.rel = "stylesheet";
            link.type = "text/css";
            document.getElementsByTagName("head")[0].appendChild(link);
            document.cookie = "font_css_cache"
        }
    }

    function appendStyle(e) {
        var style = document.createElement("style");
        style.innerHTML = e;
        document.getElementsByTagName("head")[0].appendChild(style)
    }

    var fontPath = "/font.css";
    window.localStorage && localStorage.font_css_cache || document.cookie.indexOf("font_css_cache") > -1
        ? loadCache()
        : addEvent(window, "load", loadCache)
}());