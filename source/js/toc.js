define(function (require, exports, module) {
    'use strict';

    var sticky = require('js/sticky');
    var scrollSpy = require('js/scrollSpy');

    // selectors
    var TOC_WRAP = '#topic-wrap';
    var CLASS_PROGRESS = '.toc-progress';
    var CLASS_TOC = '.toc';

    var $toc = $(TOC_WRAP);
    if (!$toc || !$toc.length) {
        return;
    }

    // 没有 toc 项
    if (!$toc.find('a').length) {
        return $toc.remove();
    }

    var nativeSpy;
    var ghostSpy;
    var $progress;
    var isStickySupported = sticky.isStickySupported;

    var stick = sticky($toc, {top: 30}, isStickySupported ? false : onSticky);

    if (isStickySupported) {
        $progress = stick.elem.find(CLASS_PROGRESS);
        nativeSpy = scrollSpy(stick.elem.find(CLASS_TOC));
    }

    function onSticky(sticking) {
        if (sticking) {
            // startSticky
            if (nativeSpy) {
                nativeSpy.destroy();
                nativeSpy = null;
            }
            $progress = this.ghost.find(CLASS_PROGRESS);
            ghostSpy = scrollSpy(this.ghost.find(CLASS_TOC));
        } else {
            // stopSticky
            if (ghostSpy) {
                ghostSpy.destroy();
                ghostSpy = null;
            }
            $progress = this.elem.find(CLASS_PROGRESS);
            nativeSpy = scrollSpy(this.elem.find(CLASS_TOC));
        }
    }

    var wHeight;

    function getHeight() {
        wHeight = $(document.body).height() - $(window).height();
    }

    function setProgress() {
        var percent = Math.max(0, Math.min(1, $(window).scrollTop() / wHeight));
        $progress.css('width', percent * 100 + '%');
    }

    $(function () {
        getHeight();
        setProgress();

        $(window)
            .on('scroll.progress', setProgress)
            .on('resize.progress', getHeight);
    });
});