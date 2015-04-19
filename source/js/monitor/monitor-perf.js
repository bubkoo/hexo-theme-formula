/**
 * 嗅探页面加载事件
 */
define(function (require, exports, module) {

    var M = require('monitor'),
        win = window,
        doc = win.document,
        readyTime,
        loadTime,
        isDomReady = false,
        isLoaded = false,
        startTime = window.performance && performance.timing ? performance.timing.navigationStart : win.__start__;

    function dispatchEvent(ele, evt, handler) {
        /**
         * 事件绑定
         */
        if (ele.attachEvent) {
            ele.attachEvent('on' + evt, function (args) {
                handler.call(ele, args)
            });
        } else if (ele.addEventListener) {
            ele.addEventListener(evt, handler, false);
        } else {
            ele['on' + evt] = function (args) {
                handler.call(ele, args)
            }
        }
    }

    function loadHandler() {
        if (!loadHandler.invoked) {
            loadHandler.invoked = true;
            // 需要在页面上埋点 __start__
            loadTime = startTime ? M.now() - startTime : NaN;
            isLoaded = true;
        }
    }

    function readyHandler() {
        if (!readyHandler.invoked) {
            readyHandler.invoked = true;
            // 需要在页面上埋点 __start__
            readyTime = startTime ? M.now() - startTime : NaN;
            isDomReady = true;
        }
    }

    function contentLoad() {
        if (document.addEventListener || event.type === 'load' || document.readyState === 'complete') {
            readyHandler();
            // 删除事件绑定
            if (document.addEventListener) {
                document.removeEventListener('DOMContentLoaded', contentLoad, false);
                win.removeEventListener('load', contentLoad, false);

            } else {
                document.detachEvent('onreadystatechange', contentLoad);
                win.detachEvent('onload', contentLoad);
            }
        }
    }

    if (win.jQuery) {
        jQuery(readyHandler);
    } else if (win.YAHOO && YAHOO.util && YAHOO.util.Event) {
        win.YAHOO.util.Event.onDOMReady(readyHandler);
    } else {
        if (doc.readyState === 'complete') {
            setTimeout(readyHandler, 0);
        } else if (win.addEventListener) {
            doc.addEventListener('DOMContentLoaded', contentLoad, false);
            win.addEventListener('load', contentLoad, false);
        } else {// 低版本 IE
            doc.attachEvent('onreadystatechange', contentLoad);
            win.attachEvent('onload', contentLoad);

            var top = false;
            try {
                // 如果文档处于 iframe 中，调用 doScroll 方法成功时并不代表DOM加载完毕
                top = win.frameElement == null && doc.documentElement;
            } catch (e) {
            }
            if (top && top.doScroll) {
                (function doScrollCheck() {
                    if (!readyHandler.invoked) {
                        try {
                            top.doScroll('left');
                        } catch (e) {
                            win.setTimeout(doScrollCheck, 50);
                            return;
                        }
                        contentLoad();
                    }
                })();
            }
        }
    }

    dispatchEvent(win, 'load', loadHandler);
    dispatchEvent(win, 'unload', loadHandler);

    function sendPerformance() {
        try {
            if (isDomReady && isLoaded) {
                M.push({
                    type: 'perf',
                    ready: readyTime,
                    load: loadTime
                });
                M.log('domReady: ' + readyTime + 'ms , loaded: ' + loadTime + 'ms.');
            } else {
                win.setTimeout(function () {
                    sendPerformance();
                }, 1800)
            }
        } catch (err) {
        }
    }

    win.setTimeout(function () {
        sendPerformance();
    }, 1800);

});