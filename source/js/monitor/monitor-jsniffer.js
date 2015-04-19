/**
 * 嗅探页面 JS 错误
 */
define(function (require, exports, module) {
    var M = require('monitor'),
        win = window;

    function onError(msg, file, line) {
        M.push({
            type: 'jsError',
            msg: msg,
            file: file,
            ln: line
        });
        // return true 可以阻止浏览器显示错误信息
        return false;
    }

    if (win.addEventListener) {
        /*
         需要特别注意addEventListener的第三个参数，是否在捕获阶段处理
         这个参数，大多数时候用的都是false
         在这里，chrome、firefox也都可以用false
         但是opera用false时就无法处理error
         必须设置为true，在捕获阶段处理error，脚本才能正常运行
         */
        win.addEventListener('error', onError, true);
    }
    else if (win.attachEvent) {
        win.attachEvent('onerror', onError);
    } else {
        win.onerror = onError;
    }
})
;