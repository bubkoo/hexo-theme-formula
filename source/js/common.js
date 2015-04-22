define(function (require, exports, module) {
    'use strict';

    // fancybox
    $('.article-content').each(function (i) {
        $(this).find('img')
            .each(function () {
                var $this = $(this);
                if ($this.parent().hasClass('fancybox')) {
                    return;
                }

                var alt = this.alt;
                if (alt) {
                    $this.after('<span class="img-caption">' + alt + '</span>');
                }

                $this.wrap('<a href="' + this.src + '" title="' + alt + '" class="fancybox" rel="gallery' + i + '" />');
            });
    });

    if ($.fancybox) {
        $('.fancybox').fancybox();
    }

    // Gallery
    function play(parent, item, callback) {
        var width = parent.width();

        item.imagesLoaded(function () {
            var _this = this[0];
            var nWidth = _this.naturalWidth;
            var nHeight = _this.naturalHeight;

            callback();
            this.animate({opacity: 1}, 500);
            parent.animate({height: width * nHeight / nWidth}, 500);
        });
    }

    $('.article-gallery').each(function () {
        var $this = $(this);
        var current = 0;
        var photoset = $this.children('.article-gallery-photos').children();
        var photoCount = photoset.length;
        var loading = true;

        play($this, photoset.eq(0), function () {
            loading = false;
        });

        $this
            .on('click', '.prev', function () {
                if (!loading) {
                    var next = (current - 1) % photoCount;
                    loading = true;

                    play($this, photoset.eq(next), function () {
                        photoset.eq(current).animate({opacity: 0}, 500);
                        loading = false;
                        current = next;
                    });
                }
            })
            .on('click', '.next', function () {
                if (!loading) {
                    var next = (current + 1) % photoCount;
                    loading = true;

                    play($this, photoset.eq(next), function () {
                        photoset.eq(current).animate({opacity: 0}, 500);
                        loading = false;
                        current = next;
                    });
                }
            });
    });

    // go2top
    function onScroll() {
        $('#go2top')[$(window).scrollTop() > 100 ? 'fadeIn' : 'fadeOut'](400);
    }

    $('#go2top').click(function () {
        $('html,body').animate({
            scrollTop: 0
        });
    });

    $(window).scroll(onScroll);

});









