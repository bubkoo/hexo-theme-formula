/**
 * Created by Johnny.Peng on 14-3-2.
 */

define(function () {

    // 分隔事件名的正则表达式
    var eventSplitter = /\s+/;

    function getObjectKeys(obj) {
        var result = [];
        if (obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    result.push(key);
                }
            }
        }
        return result;
    }

    function isFunction(func) {
        return Object.prototype.toString.call(func) === '[object Function]';
    }

    function triggerEvents(callbackList, args, context) {
        var result = true,
            i = 0,
            l,
            arg1,
            arg2,
            arg3;

        if (callbackList) {
            l = callbackList.length;
            arg1 = args[0];
            arg2 = args[1];
            arg3 = args[2];
            // call 的性能比 apply 好，最好使用小于三个参数
            // http://blog.csdn.net/zhengyinhui100/article/details/7837127
            switch (args.length) {
                case 0:
                    for (; i < l; i += 2) {
                        result = callbackList[i].call(callbackList[i + 1] || context) !== false && result;
                    }
                    break;
                case 1:
                    for (; i < l; i += 2) {
                        result = callbackList[i].call(callbackList[i + 1] || context, arg1) !== false && result;
                    }
                    break;
                case 2:
                    for (; i < l; i += 2) {
                        result = callbackList[i].call(callbackList[i + 1] || context, arg1, arg2) !== false && result;
                    }
                    break;
                case 3:
                    for (; i < l; i += 2) {
                        result = callbackList[i].call(callbackList[i + 1] || context, arg1, arg2, arg3) !== false && result;
                    }
                    break;
                default:
                    for (; i < l; i += 2) {
                        result = callbackList[i].apply(callbackList[i + 1] || context, args) !== false && result;
                    }
                    break;
            }
        }
        // 只要任何一个回调返回 false，返回的最终结果就是 false
        return result;
    }

    function Events() {
    }

    Events.prototype.on = function (events, callback, context) {
        /**
         * object.on(events, callback, [context])
         * 给对象添加事件回调函数
         *
         * 参数：
         *     events - 事件名，可以同时添加多个，事件名之间用空格分开；
         *         特殊取值 *，对象上触发任何事件，都会触发 * 事件的回调函数，
         *         传给 * 事件回调函数的第一个参数是事件名。
         *     callback - 回调函数。
         *     context - 回调函数调用时的 this 值。
         *
         * 返回值：
         *     对象本身
         */
        var cache,
            event,
            list;

        if (!callback) {
            return this;
        }

        if (!this.__events) {
            this.__events = {};
        }
        cache = this.__events;

        events = events.split(eventSplitter);

        while (event = events.shift()) {
            if (!cache[event]) {
                cache[event] = [];
            }
            list = cache[event];
            list.push(callback, context); // 同时添加两个元素到数组
        }

        return this;
    };

    Events.prototype.once = function (events, callback, context) {
        /**
         * 所绑定的 callback 只会被调用一次，被调用后永远不会再次被调用
         */
        var that = this;
        var cb = function () {
            that.off(events, cb)
            callback.apply(this, arguments);
        }
        this.on(events, cb, context);
    };

    Events.prototype.off = function (events, callback, context) {
        /**
         * object.off([events], [callback], [context])
         * 从对象上移除事件回调函数
         *
         * 参数：
         *     三个参数都是可选的，当省略某个参数时，表示取该参数的所有值。例如：
         *
         *     移除 change 事件上名为 onChange 的回调函数
         *     object.off('change', onChange);
         *
         *     移除 change 事件的所有回调函数
         *     object.off('change');
         *
         *     移除所有事件上名为 onChange 的回调函数
         *     object.off(null, onChange);
         *
         *     移除上下文为 context 的所有事件的所有回调函数
         *     object.off(null, null, context);
         *
         *     移除 object 对象上所有事件的所有回调函数
         *     object.off();
         *
         * 返回值：
         *     对象本身
         */
        var cache,
            event,
            list,
            i;

        cache = this.__events;
        if (!cache) {
            // 没有绑定任何事件，直接返回
            return this;
        }
        if (!events && !callback && !context) {
            // 三个参数都为空，删除所有事件
            delete this.__events;
            return this;
        }

        if (events) {
            // 如果 events 指定了事件名
            events = events.split(eventSplitter)
        } else {
            // 否则将遍历所有绑定的事件
            events = getObjectKeys(cache);
        }


        while (event = events.shift()) {
            // 遍历事件
            list = cache[event];
            if (!list) {
                continue;
            }

            if (!callback && !context) {
                // 对应的回调函数和执行上下文都为空，表示删除该事件所有的回调
                delete cache[event];
                continue;
            }

            for (i = list.length - 2; i >= 0; i -= 2) {
                if ((!callback || list[i] === callback) &&
                    (!context || list[i + 1] === context)) {
                    list.splice(i, 2);
                }
            }
            if (list && list.length === 0) {
                // 如果 event 不再存在回调，则删除分配的数组对象，释放内存
                delete cache[event];
            }
        }


        return this;
    };

    Events.prototype.trigger = function (events) {
        /**
         * object.trigger(events, [*args])
         * 触发一个或多个事件（用空格分隔）。*args 参数会依次传给回调函数。
         *
         * 返回值：
         *     一个布尔值，会根据所有 callback 的执行情况返回。
         *     只要有一个 callback 返回 false，trigger 就会返回 false。
         */

        var cache,
            event,
            allCallbacks,
            callbackList,
            i,
            l,
            args = [],
            result = true;

        cache = this.__events;
        if (!cache) {
            return this;
        }

        events = events.split(eventSplitter);

        // 将回调函数的参数放入 rest 中，这里只需要除开第一个参数之外的参数放入 rest 中
        // 所以，用循环的性能比 Array.slice 好
        for (i = 1, l = arguments.length; i < l; i++) {
            args[i - 1] = arguments[i]
        }

        // 对于每个事件，将进行两次遍历
        // 第一次遍历该事件对应的回调
        // 第二次遍历 '*' 对应的回调
        while (event = events.shift()) {
            // 复制回调函数数组，避免被修改
            allCallbacks = cache['*'];
            if (allCallbacks) {
                allCallbacks = allCallbacks.slice();// 拷贝
            }

            if ('*' !== event) {
                // 事件名不是所有事件 '*'，防止 event = '*' 时执行两次回调
                callbackList = cache[event];
                if (callbackList) {
                    callbackList = callbackList.slice();// 拷贝
                }

                result = triggerEvents(callbackList, args, this) && result;
            }

            // 对于 '*' 将事件名作为回调函数的第一个参数
            result = triggerEvents(allCallbacks, [event].concat(args), this) && result;
        }

        return result;
    };

    // trigger 的别名方法
    Events.prototype.emit = Events.prototype.trigger;

    Events.mixTo = function (receiver) {
        /**
         * 将 Events 的原型方法混入到指定对象或函数原型中
         */
        receiver = isFunction(receiver) ? receiver.prototype : receiver;
        var proto = Events.prototype;

        for (var p in proto) {
            if (proto.hasOwnProperty(p)) {
                receiver[p] = proto[p];
            }
        }
    };

    return Events;
});