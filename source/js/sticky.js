define(function (require, exports, module) {
    'use strict';

    var
        undefined,
        doc = $(document),
        stickyPrefix = ['-webkit-', '-ms-', '-o-', '-moz-', ''],
        guid = 0,

        ua = (window.navigator.userAgent || '').toLowerCase(),
        isIE = ua.indexOf('msie') !== -1,
        isIE6 = ua.indexOf('msie 6') !== -1,

        isStickySupported = isPositionStickySupported(),
        isFixedSupported = !isIE6;

    function Sticky(options) {
        this.options = options || {};
        this.elem = $(this.options.element);
        this.position = this.options.position;
        this.callback = options.callback || function () {};
        this.stickyId = guid++;
    }

    Sticky.prototype.adjust = function () {
        var offset = this.elem.offset(),
            parent = this.elem.parent(),
            top = this.position.top,
            bottom = this.position.bottom;

        this.originWidth = this.elem.width();
        this.originLeft = offset.left;

        // get the sticky range
        if (top !== undefined) {
            this.startY = round(offset.top - top);
            this.endY = round(parent.offset().top + parent.outerHeight() - int(parent.css('border-top-width')) - int(parent.css('border-bottom-width')) - this.elem.outerHeight() - (int(parent.css('padding-bottom')) + int(this.elem.css('margin-bottom'))) - top);

        } else if (bottom !== undefined) {
            this.startY = round(parent.offset().top + int(parent.css('border-top-width')) + int(parent.css('padding-top')) + int(this.elem.css('margin-top')) + this.elem.outerHeight() + bottom - $(window).height());
            this.endY = round(offset.top + bottom + this.elem.outerHeight() - $(window).height());
        }
    };

    Sticky.prototype.render = function () {
        // only bind once
        if (!this.elem.length || this.elem.data('bind-sticked')) {
            return this;
        }

        if (isStickySupported) {
            this.natcveSticky();
        } else {
            this.fixedSticky();
        }

        this.elem.data('bind-sticked', true);
        return this;
    };

    Sticky.prototype.natcveSticky = function () {
        var tmp = '';
        for (var i = 0; i < stickyPrefix.length; i++) {
            tmp += 'position:' + stickyPrefix[i] + 'sticky;';
        }
        if (this.position.top !== undefined) {
            tmp += 'top: ' + this.position.top + 'px;';
        }
        if (this.position.bottom !== undefined) {
            tmp += 'bottom: ' + this.position.bottom + 'px;';
        }
        this.elem[0].style.cssText += tmp;

        var self = this;
        var scrollCallback = function () {
            var scrollTop = doc.scrollTop(),
                top = self.position.top,
                bottom = self.position.bottom;

            if (top != undefined) { // sticky top
                if (scrollTop > self.startY && scrollTop < self.endY) {
                    self.startStick();
                } else if (scrollTop <= self.startY) {
                    self.stopStick();
                } else if (scrollTop >= self.endY) {
                    self.startStick();
                }

            } else if (bottom != undefined) { // sticky bottom

                if (scrollTop > self.startY && scrollTop < self.endY) {
                    self.startStick();
                } else if (scrollTop >= self.endY) {
                    self.stopStick();
                } else if (scrollTop <= self.startY) {
                    self.startStick();
                }
            }
        };
        $(window)
            .on('load.sticky'+ this.stickyId, function () {
                self.adjust();
            })
            .on('scroll.sticky' + this.stickyId, function () {
                scrollCallback.call(self);
            })
            .on('resize.sticky' + this.stickyId, debounce(function () {
                self.stopStick();
                scrollCallback.call(self);
            }, 120));
    };

    Sticky.prototype.fixedSticky = function () {
        this.adjust();
        this.ghost = this.elem.clone(true);
        var self = this,
            id = this.elem.attr('id');
        if (id) {
            this.ghost.attr('id', id + '-sticky-polyfill-' + this.stickyId);
        }

        if (!isFixedSupported) {
            // avoid floatImage Shake for IE6
            // source from: https://github.com/lifesinger/lifesinger.github.com/blob/master/lab/2009/ie6sticked_position_v4.html
            $('<style id="ie6-sticky" type="text/css"> * html{ background:url(null) no-repeat fixed; } </style>').appendTo('head');
        }

        var scrollCallback = function () {

            var scrollTop = doc.scrollTop(),
                top = self.position.top,
                bottom = self.position.bottom;

            if (top != undefined) { // sticky top
                if (scrollTop > self.startY && scrollTop < self.endY) {
                    self.startStick();
                    self.ghost.css({
                        position: isFixedSupported ? 'fixed' : 'absolute',
                        width: self.originWidth,
                        left: self.originLeft,
                        top: isFixedSupported ? top : top + scrollTop
                    });
                } else if (scrollTop <= self.startY) {
                    self.stopStick();
                } else if (scrollTop >= self.endY) {
                    self.startStick();
                    self.ghost.offset({
                        left: self.originLeft,
                        top: self.endY + top
                    });
                }

            } else if (bottom != undefined) { // sticky bottom

                if (scrollTop > self.startY && scrollTop < self.endY) {
                    self.startStick();
                    self.ghost.css({
                        position: isFixedSupported ? 'fixed' : 'absolute',
                        width: self.originWidth,
                        left: self.originLeft,
                        top: '',
                        bottom: bottom
                    });
                } else if (scrollTop >= self.endY) {
                    self.stopStick();
                } else if (scrollTop <= self.startY) {
                    self.startStick();
                    self.ghost.css({
                        left: self.originLeft,
                        bottom: ''
                    });
                    self.ghost.offset({
                        top: self.startY + $(window).height() - self.elem.outerHeight() - bottom
                    });
                }
            }
        };

        $(window)
            .on('load.sticky'+ this.stickyId, function () {
                // 当页面有较多图片时，需要在 load 之后，重新计算
                self.adjust();
            })
            .on('scroll.sticky' + this.stickyId, function () {
                scrollCallback.call(self);
            })
            .on('resize.sticky' + this.stickyId, debounce(function () {
                self.stopStick();
                self.adjust();
                scrollCallback.call(self);
            }, 120));

        scrollCallback(this);
    };

    Sticky.prototype.startStick = function () {
        if (!this.sticking) {
            this.sticking = true;
            if (!isStickySupported) {
                this.elem.css('visibility', 'hidden');
                this.ghost.insertAfter(this.elem);
                if (this.position.top != undefined) {
                    this.ghost.css('margin-top', 'auto');
                }
            }
            this.callback.call(this, true);
        }
    };

    Sticky.prototype.stopStick = function () {
        if (this.sticking || this.sticking === undefined) {
            this.sticking = false;
            if (!isStickySupported) {
                this.elem.css('visibility', 'visible');
                this.ghost = this.ghost.detach();
            }
            this.callback.call(this, false);
        }
    };

    Sticky.prototype.destroy = function () {
        this.stopStick();
        this.elem.data('bind-sticked', false);
        $(window).off('.sticky' + this.stickyId);
        if (!isFixedSupported && !isStickySupported) {
            $('#ie6-sticky').remove();
        }
    };


    function sticky(elem, position, callback) {
        if (!isObject(position)) {
            position = {
                top: int(position)
            }
        }

        if (position.top === undefined && position.bottom === undefined) {
            position.top = 0;
        }

        return (new Sticky({
            element: elem,
            position: position,
            callback: callback
        })).render();

    }

    // sticky.stick(elem, position)
    sticky.stick = sticky;

    sticky.isFixedSupported = isFixedSupported;
    sticky.isStickySupported = isStickySupported;

    // Exports
    // -------

    module.exports = sticky;

    // Helper
    // -------

    function isObject(obj) {
        return typeof obj === 'object';
    }

    function round(value) {
        return Math.round(value);
    }

    function int(value) {
        return parseInt(value, 10);
    }

    function isPositionStickySupported() {
        if (isIE) {
            return false;
        }

        var isSupported = false,
            document = doc[0],
            body = document.body;

        if (document.createElement && body && body.appendChild && body.removeChild) {

            var elem = document.createElement('div'),
                getStyle = function (styleName) {
                    if (getComputedStyle) {
                        return getComputedStyle(elem).getPropertyValue(styleName);
                    } else {
                        return elem.currentStyle.getAttribute(styleName);
                    }
                };

            body.appendChild(elem);

            for (var i = 0; i < stickyPrefix.length; i++) {
                elem.style.cssText = 'position:' + stickyPrefix[i] + 'sticky; visibility:hidden;';
                if (isSupported = getStyle('position').indexOf('sticky') !== -1) {
                    break;
                }
            }

            elem.parentNode.removeChild(elem);
        }
        return isSupported;
    }

    // source from: https://github.com/jashkenas/underscore/blob/master/underscore.js#L699
    function getTime() {
        return (Date.now || function () {
            return new Date().getTime();
        })()
    }

    function debounce(func, wait, immediate) {
        var timeout, args, context, timestamp, result;
        return function () {
            context = this;
            args = arguments;
            timestamp = getTime();
            var later = function () {
                var last = getTime() - timestamp;
                if (last < wait) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                    }
                }
            };
            var callNow = immediate && !timeout;
            if (!timeout) {
                timeout = setTimeout(later, wait);
            }
            if (callNow) {
                result = func.apply(context, args);
            }
            return result;
        };
    }
});