var hasOwn = Object.prototype.hasOwnProperty;
var blocks = {
    div: 'div',
    section: 'section'
};

for (var key in blocks) {
    if (hasOwn.call(blocks, key)) {
        var tagName = blocks[key];

        (function (key, tag) {
            hexo.extend.tag.register(key, function (args, content) {
                args = args || [];
                args.unshift(key);
                var className = args.join(' ');

                content = hexo.render.renderSync({
                    text: content,
                    engine: 'markdown'
                });
                return '<' + tag + ' class="' + className + '">' + content + '</' + tag + '>';
            }, {
                ends: true
            });
        })(key, tagName);
    }
}


// 指定 filter 的优先级，内置 filter 的优先级为 10，值越小越先执行
// hexo.extend.filter.register('before_post_render', require('./lib/extra-syntax'), 9);

hexo.on('new', require('./lib/on-new'));
