/**
 * Created by Johnny.Peng on 14-3-2.
 */

define(function (require, exports) {

    exports.before = function (methodName, callback, context) {
        /**
         * object.before(methodName, callback, [context])
         * 在 object[methodName] 方法执行前，先执行 callback 函数，
         * callback 函数在执行时，接收的参数与传给 object[methodName] 参数相同，
         * 如果传入了 context 参数，则 callback 里的 this 指向 context。
         *
         * 如果 callback 执行后返回 false，那么 object[methodName] 不会被执行，
         * 如果还有 after callback，同样也不会被执行
         */
        return weave.call(this, 'before', methodName, callback, context);
    };

    exports.after = function (methodName, callback, context) {
        /**
         * object.after(methodName, callback, [context])
         * 在 object[methodName] 方法执行后，再执行 callback 函数，
         * callback 函数在执行时，接收的参数是在传给 object[methodName]
         * 的参数前面加上了 object[methodName] 方法执行后的返回值，
         * 如果传入了 context 参数，则 callback 里的 this 指向 context。
         */
        return weave.call(this, 'after', methodName, callback, context);
    };

    exports.around = function (methodName, callback, context) {
        /**
         * object.around(methodName, callback, [context])
         * 在 object[methodName] 方法执行前和执行后，分别 callback 函数，
         *
         * 如果第一次执行 callback 返回 false，那么 object[methodName] 不会被执行
         */
        weave.call(this, 'before', methodName, callback, context);
        weave.call(this, 'after', methodName, callback, context);
        return this;
    };

    var eventSplitter = /\s+/;

    function weave(when, methodName, callback, context) {
        var names = methodName.split(eventSplitter),
            name,
            method;

        while (name = names.shift()) {
            method = getMethod(this, name);
            if (!method.__isAspected) {
                wrap.call(this, name);
            }
            this.on(when + ':' + name, callback, context);
        }

        return this;
    }

    function getMethod(host, methodName) {
        var method = host[methodName];
        if (!method) {
            throw new Error('Invalid method name: ' + methodName);
        }
        return method;
    }

    function wrap(methodName) {
        // 将函数
        var old = this[methodName];// 旧方法

        this[methodName] = function () {
            var args = Array.prototype.slice.call(arguments),
                beforeArgs = ['before:' + methodName].concat(args),
                afterArgs,
                result;

            // 如果返回 trigger false ，则后面的 handler 将不会执行
            if (this.trigger.apply(this, beforeArgs) === false) {
                return;
            }

            result = old.apply(this, arguments); // 调用函数本身

            // 将函数执行结果作为参数传给 after callback，
            // 然后可以根据返回值选择是否执行 after callback
            // 或者进行其他操作
            afterArgs = ['after:' + methodName, result].concat(args),
                this.trigger.apply(this, afterArgs);

            return result;
        };

        this[methodName].__isAspected = true;
    }
});