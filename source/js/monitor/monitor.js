define(function (require, exports, module) {
    var detector = require('detector'),

        win = window,
        doc = win.document,
        loc = win.location,

        version = '0.6.0',  // 当前版本号
        debug = true,
        logServer = 'http://monitor.bubkoo.com/m.gif',      // 日志记录发送的服务器地址
        urlLength = detector.engine.trident ? 2083 : 8190,  // url的最大长度

        dataCache = [],     // 将要发送的数据队列
        timerCache = {},    // 记录时间
        sending = false,    // 当前是否正在发送消息

        commonData = {      // 没条消息的通用数据
            url: loc.href,
            ref: doc.referrer || '-',
            cnt: detector.device.name + '/' + detector.device.fullVersion + '|' +
                detector.os.name + '/' + detector.os.fullVersion + '|' +
                detector.browser.name + '/' + detector.browser.fullVersion + '|' +
                detector.engine.name + '/' + detector.engine.fullVersion + '|' +
                win.screen.width + '/' + win.screen.height + '/' + win.screen.colorDepth +
                (detector.browser.compatible ? '|c' : ''),
            v  : version
        },
    // TODO: 单页应用 url 不刷新的问题，考虑将 url 和 ref 移除 commonData
        commonDataStr = param(commonData),
        reg_fun = /^function\b[^\)]+\)/,
        M = win.monitor ? win.monitor : {};

    M.isIE = !!detector.browser.ie;

    M.URI = {
        reFolderExt: /[^\/]*$/,
        reProtocol : /^\w+:/,
        reDataURI  : /^data:/,

        abs: function (uri) { // 绝对路径
            if (!M.URI.reProtocol.test(uri)) {
                if (uri.indexOf('/') === 0) {// 相对网站根路径，例如 /pages/index.html
                    uri = loc.protocol + '//' + loc.hostname + uri;
                } else {
                    if (uri.indexOf('.') == 0) { // 相对路径，例如 ../pages/index.html
                        uri = loc.protocol + '//' + loc.hostname + loc.pathname.replace(M.URI.reProtocol, uri);
                    } else {
                        uri = M.URI.folder(loc.href) + uri;
                    }
                }
            }
            return uri;
        },

        parse: function (uri) {
            if (!uri || typeof (uri) !== 'string') {
                return '';
            }
            var host = M._loc.protocol + '//' + M._loc.hostname,
                base = host + M._loc.pathname.replace(M.URI.reFolderExt, uri);
            var a = doc.createElement('a');
            a.setAttribute('href', M.URI.abs(uri));
            return a;
        },

        isExternalRes: function (uri) {
            if (!uri || typeof (uri) !== 'string') {
                return false;
            }
            return  0 === uri.indexOf('http:') || 0 === uri.indexOf('https:') || 0 == uri.indexOf('file:');
        },

        path: function (uri) {
            if (!uri || typeof (uri) !== 'string') {
                return '';
            }
            var idx = 0;
            do {
                idx = uri.indexOf('?', idx);
                if (idx < 0) {
                    break;
                }
                if ('?' === uri.charAt(idx + 1)) {
                    idx += 2;
                } else {
                    break;
                }
            } while (idx >= 0);
            return idx < 0 ? uri : uri.substr(0, idx)
        },

        folder: function (uri) {
            if (!uri || typeof (uri) !== 'string') {
                return '';
            }
            var idx = uri.lastIndexOf('/');
            return idx < 0 ? '' : uri.substr(0, idx + 1);
        }
    };

    M.now = function (hrt) {
        /**
         * 获取当前时间
         */
        if (hrt && win.performance && 'function' === typeof win.performance.now) {
            return win.performance.now();
        } else {
            return ('function' === typeof Date.now) ? Date.now() : new Date().valueOf();
        }
    };

    M.log = function (msg) {
        /**
         * 在debug模式下，输出信息到console控制台中
         */
        if (debug && win.console && console.log) {
            console.log(msg);
        }
    };

    M.timerStart = function (name) {
        /**
         * 记录某个事务的开始时间
         * @param {String} name 事务名称
         */
        if (!(name && 'string' === typeof name)) {
            return;
        }
        timerCache[name] = M.now(true);
    };

    M.timerEnd = function (name) {
        /**
         * 事务结束时调用，计算事务的耗时并发送到日志服务器
         * @param {String} name 事务名称
         * @return {Number} 事务的耗时
         */
        if (!(name && 'string' === typeof name)) {
            return NaN;
        }
        var start = timerCache[name];
        if (!start) {
            return NaN;
        }
        var now = M.now(true),
            timeSpan = now - start;
        M.dataCache.push({
            type: 'timer',
            name: name,
            time: timeSpan
        });
        M.send();
        return timeSpan;
    };

    M.push = function (datas) {
        /**
         * 将要发送的数据放到发送队列中
         */
        var data;
        if (!isArray(datas)) {
            datas = [datas];
        }
        while (data = datas.shift()) {
            dataCache.push(data);
        }
        timedSend();
    };

    M.pushDOMLint = function (arr) {
        var data = [],
            i,
            l;
        for (i = 0, l = arr.length; i < l; i++) {
            // 将对象转换为字符串，不然用 param 方法不能格式化
            data.push(obj2String(arr[i]));
        }

        var list = part(data, urlLength - commonDataStr.length - 300);
        for (i = 0, l = list.length; i < l; i++) {
            M.push({
                type: 'dlint',
                err : list[i]
            });
        }
    };

    M.error = function (err) {
        /**
         * try..catch.. 异常调用
         */
        if (!(err instanceof Error)) {
            return;
        }

        var stack = err.stack || '';
        // 函数的调用堆栈
        if (!stack && arguments.callee.caller) {
            // 获取函数的调用堆栈
            var myCaller = arguments.callee.caller,
                callStack = [];
            for (var i = 0; i <= 20; i++) {
                if (myCaller.arguments && myCaller.arguments.callee && myCaller.arguments.callee.caller) {
                    myCaller = myCaller.arguments.callee.caller;
                    callStack.push('at ' + getFunName(myCaller));
                    if (myCaller.caller === myCaller) {
                        break;
                    }
                }
            }
            stack = callStack.join('\n')
        }
        M.push({
            type: 'jsError',
            msg : err.message || err.description || '',
            name: err.name || '',
            num : err.number || 0,
            fl  : err.fileName || '',
            ln  : err.lineNumber || err.line || 0,
            cn  : err.columnNumber || err.column || 0,
            stk : stack
        });
    };

    // Exports
    // -------
    module.exports = M;

    // Helpers
    // -------
    function getFunName(caller) {
        var mc = String(caller).match(reg_fun);
        return mc ? mc[0] : '';
    }

    function toString(object) {
        return Object.prototype.toString.call(object);
    }

    function isString(obj) {
        return toString(obj) === '[object String]';
    }

    function isArray(obj) {
        return toString(obj) === '[object Array]';
    }

    function isObject(obj) {
        return toString(obj) === '[object Object]';
    }

    function rand() {
        var s = '' + Math.random(),
            l = s.length;
        return s.substr(2, 2) + s.substr(l - 2);
    }

    function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function obj2String(obj) {
        var arr = [];
        for (var k in obj) {
            if (has(obj, k)) {
                arr.push(k + '^' + obj[k]);
            }
        }
        return arr.join('|');
    }

    function part(arr, len) {
        var data = arr.slice(0),
            list = [
                []
            ],
            idx = 0,
            cache;
        while (data.length > 0) {
            cache = {
                'xxxxx': list[idx].concat(data[0])
            };
            if (param(cache).length < len) {
                list[idx].push(data.shift());
            } else {
                list[++idx] = [];
                list[idx].push(data.shift());
            }
        }
        return list;
    }

    function escapeString(str) {
        /**
         * 必要的字符串转义，保证发送的数据是安全的
         * @param {String} str
         * @return {String}
         */
        return String(str).replace(/(?:\r\n|\r|\n)/g, '<CR>');
    }

    function param(obj) {
        /**
         * 将对象转为键值对参数字符串
         */
        if (!isObject(obj)) {
            return '';
        }
        var p = [];
        for (var k in obj) {
            if (has(obj, k)) {
                if (isArray(obj[k])) {
                    for (var i = 0, l = obj[k].length; i < l; i++) {
                        p.push(k + '=' + encodeURIComponent(escapeString(obj[k][i])));
                    }
                } else {
                    p.push(k + '=' + encodeURIComponent(escapeString(obj[k])));
                }
            }
        }
        return p.join('&');
    }

    function timedSend() {
        /**
         * 分时发送队列中的数据，避免 IE(6) 的连接请求数限制。
         */
        if (sending) {
            return;
        }
        var data = dataCache.shift();
        if (!data) {
            return;
        }
        sending = true;
        send(logServer, data, function () {
            sending = false;
            timedSend();
        });
    }

    function send(host, data, callback) {
        if (!callback) {
            callback = function () {
            };
        }
        if (!data) {
            callback();
            return;
        }
        data.rnd = rand();
        var d = param(data);
        d = d + '&' + commonDataStr;
        var url = host + (host.indexOf('?') < 0 ? '?' : '&') + d;
        // 忽略超长 url 请求，避免资源异常。
        if (url.length > urlLength) {
            callback();
            return;
        }

        // @see http://www.javascriptkit.com/jsref/image.shtml
        // 需要 img 这个变量一直保持到 onload、onerror 和 onabort 中的任何一个
        // 触发之后才释放，避免某些浏览器的垃圾回收机制在 send 执行结束后 img 就立即被回收。
        var img = new Image(1, 1);
        img.onload = img.onerror = img.onabort = function () {
            callback();
            img.onload = img.onerror = img.onabort = null;
            img = null;
        };

        /// TODO: 打开发送给服务器的连接
        //        img.src = url;
    }
});