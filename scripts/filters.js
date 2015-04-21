
// 增强 markdown 功能：
// 插入高亮代码块，并将 JavaScript、CSS 和 HTML 注入到页面
//   ````language
//   ````
// 仅仅注入代码：
//   `````language
//   `````
function normalFencedCode(data) {
    var source = data.source;
    var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
    if ('.js.css.html.htm'.indexOf(ext) === -1) {
        data.content = data.content
            .replace(/^````([\w\:]+)$/gm, '````$1+')
            .replace(/^`````([\w\:]+)$/gm, '`````$1-');
    }

    //if (source === '_posts/tag-demos.md') {
    //    console.log();
    //    console.log(data.content);
    //}
}

var rFenceCode = /(\s*)(`{3,}|~{3,}) *(.*) *\n([\s\S]+?)\s*\2(\n+|$)/g;
var rLang = /([^\s]+)\s*(.+)?\s*(.+)?/;

function insertFencedCode(data) {
    data.content = data.content.replace(rFenceCode, function (raw, start, fence, args, content, end) {
        if (!args) {
            return raw;
        }

        var match;
        if (rLang.test(rLang)) {
            match = args.match(rLang);
        }
        var language = match && match[1] || '';
        if (!language) {
            return raw;
        }

        var lastChar = language.slice(-1);
        var hide = lastChar === '-';
        var inject = (lastChar === '-' || lastChar === '+');

        if (!inject) {
            return raw;
        }
        language = language.slice(0, -1);
        language = language.toLowerCase();
        language = getLanguage(language);

        if (['javascript', 'css', 'html'].indexOf(language) !== -1) {
            inject = inject && true;
        }

        if (!inject) {
            return raw;
        }

        content = injectCode(language, content);

        return hide ? content : raw + content;
    });

    //if (data.source === '_posts/tag-demos.md') {
    //    console.log();
    //    console.log(data.content);
    //}

}

function fallback(data) {
    // 为 source 文件夹下面的 HTML、JS、CSS 文件返回原始文件，使得之前的所有处理失效，
    // 这是避免为了一些对 HTMl 的过度处理，还有原生的 external_link filter 将对所有
    // 文件进行处理，而且处理后导致一些 JS 文件的错误，所以对于这些文件都在这里还原为最
    // 原本的（raw）内容

    // 资源的相对路径
    var source = data.source;

    var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
    if ('.js.css.html.htm'.indexOf(ext) !== -1) {
        data.content = data.raw;  // 返回原始内容
        data.layout = false;      // 禁止用 theme 渲染
    }
}

// 指定 filter 的优先级，内置 filter 的优先级为 10，值越小越先执行
hexo.extend.filter.register('before_post_render', normalFencedCode, 8);
hexo.extend.filter.register('before_post_render', insertFencedCode, 9);
hexo.extend.filter.register('after_post_render', fallback, 100);


// Helpers
// -------

var langMap = {
    'css': 'css',
    'htm': 'html',
    'html': 'html',
    'javascript': 'javascript',
    'js': 'javascript',
    'json': 'javascript'
};

var injectMap = {
    'javascript': function (code) {
        return '<script>' + code + '</script>';
    },
    'css': function (code) {
        return '<style type="text/css">' + code + '</style>';
    },
    'html': function (code) {
        return '<div class="hexo-insert-code">' + code + '</div>';
    }
};

function getLanguage(lang) {
    if (lang && langMap[lang]) {
        lang = langMap[lang];
    }
    return lang;
}

function injectCode(lang, code) {
    if (injectMap[lang]) {
        code = injectMap[lang](code);
    }
    return '<escape>' + code + '</escape>';
}