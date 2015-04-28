define(function (require, exports, module) {
    'use strict';

    var guid = 0;

    function ScrollSpy(options) {
        var that = this;
        options = $.extend({}, ScrollSpy.defaults, options);
        // 决定绑定滚动事件的元素
        that.options = options;
        that.container = $(options.container);
        that.elem = $(options.element);
        if (!that.elem.length || that.elem.data('bind-scrollSpy')) {
            return that;
        }
        that.spyId = guid++;

        that.container
            .on('scroll.scrollSpy' + that.spyId, function () {
                that.process();
            })
            .on('resize.scrollSpy' + that.spyId, function () {
                that.adjust();
            });
        that.elem.data('bind-scrollSpy', true);
        that.adjust();
        that.process();

        return that;
    }

    ScrollSpy.defaults = {
        linkSelector: 'a',
        container: window,
        offset: 10,
        activeClass: 'active',
        callback: function () { }
    };

    ScrollSpy.prototype = {
        constructor: ScrollSpy,
        adjust: function () {
            var that = this;
            var options = that.options;
            that.offsets = [];
            that.targets = [];
            that.activeTarget = null;

            var isWindow = $.isWindow(this.container);
            var offsetMethod = isWindow ? 'offset' : 'position';

            that.elem.find(options.linkSelector).map(function () {
                var link = $(this);
                var selector = link.attr('href');

                if (selector) {
                    // 替换 selector 中的特殊字符
                    selector = selector.replace(/([\s\.\*\=\+\>\,\[\]\:\~\?\'\"\(\)])/g, '\\$1');

                    try {
                        var target = /^#./.test(selector) && $(selector);
                        return (target && target.length && target.is(':visible') && [
                            [
                                target[offsetMethod]().top + (isWindow ? 0 : that.elem.scrollTop()),
                                selector
                            ]
                        ]);
                    } catch (e) {

                    }
                }
            }).filter(function (o) { // 用了原生方法，注意兼容性
                // 过滤掉空元素
                return !!o;
            }).sort(function (a, b) {
                return a[0] - b[0];
            }).each(function () {
                // 收集偏离值
                that.offsets.push(this[0]);
                // 收集href值（ID 选择器）
                that.targets.push(this[1]);
            });

            return that;
        },
        process: function () {
            var that = this;
            var scrollTop = that.container.scrollTop() + that.options.offset;
            // 内容的高度
            var scrollHeight = this.container[0].scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            // 最大可以滚动的高度
            var maxScroll = scrollHeight - this.container.height();
            var offsets = that.offsets;
            var targets = that.targets;
            var activeTarget = that.activeTarget;
            var i;

            if (scrollTop >= maxScroll) {
                activeTarget != (i = targets[targets.length - 1]) && this.active(i);
            } else if (activeTarget && scrollTop <= offsets[0]) {
                activeTarget != (i = targets[0]) && this.active(i);
            } else {
                for (i = offsets.length; i--;) {
                    // 遍历offset中，寻找一个最接近顶部的元素
                    activeTarget != targets[i]
                    && scrollTop >= offsets[i]
                    && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
                    && this.active(targets[i]);
                }
            }

            return that;
        },
        active: function (target) {
            var that = this;
            var options = that.options;
            var oldTarget = that.activeTarget;
            var activeClass = that.options.activeClass;
            that.activeTarget = target;

            $(this.elem).find(options.linkSelector)
                .filter('.' + activeClass).removeClass(activeClass)
                .end()
                .filter('[href=' + target + ']').addClass(activeClass);

            options.callback.call(this, oldTarget, target);

            return that;
        },
        destroy: function () {
            var that = this;
            that.container.off('.scrollSpy' + that.spyId);
            that.elem.data('bind-scrollSpy', false);
        }
    };

    function scrollSpy(element, options) {
        options = options || {};
        options.element = element;
        return new ScrollSpy(options);
    }

    // default settings
    scrollSpy.defaults = ScrollSpy.defaults;

    // Exports
    // -------
    module.exports = scrollSpy;
});