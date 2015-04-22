/*
 * Markdown Extra Syntax
 * ---------------------
 *
 * - Fenced Code with Highlight
 *
 *   ```javascript
 *   var foo = "bar";
 *   ```
 *
 * - Highlight Code with Inserted Code
 *
 *   ````javascript
 *   var foo = "bar";
 *   ````
 *
 * - Just insert code
 *
 *   `````javascript
 *   var foo = "bar";
 *   `````
 * */

var rFenceCode = /(\s*)(`{3,}|~{3,}) *(.*) *\n([\s\S]+?)\s*(\2)(\n+|$)/g;
var rLang = /([^\s]+)\s*(.+)?\s*(.+)?/;

var langMap = {
    'css': 'css',
    'htm': 'html',
    'html': 'html',
    'javascript': 'javascript',
    'js': 'javascript',
    'json': 'javascript'
};

var injectFn = {
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
    if (injectFn[lang]) {
        code = injectFn[lang](code);
    }
    return '\n<escape>' + code + '</escape>\n';
}

function extraSyntax(data) {
    var source = data.source;
    var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
    if ('.js.css.html.htm'.indexOf(ext) > -1) {
        return;
    }

    data.content = data.content
        //.replace(/^````([\w\:]+)$/gm, '````$1+')
        //.replace(/^`````([\w\:]+)$/gm, '`````$1-')
        .replace(rFenceCode, function (raw, start, startQuote, args, content, endQuote, end) {
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

            var quoteCount = startQuote.length;
            var hide = quoteCount >= 5;
            var inject = (quoteCount === 4 || hide);

            if (!inject) {
                return raw;
            }
            //language = language.slice(0, -1);
            language = language.toLowerCase();
            language = getLanguage(language);

            if (['javascript', 'css', 'html'].indexOf(language) !== -1) {
                inject = inject && true;
            }

            if (!inject) {
                return raw;
            }
            // 替换为原生的 3 个反引号
            var native = start + '```' + args + '\n' + content + '\n```' + end;
            var injected = injectCode(language, content);

            return hide ? injected : native + injected;
        });
}

function rollbackStatics(data) {
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
// hexo.extend.filter.register('before_post_render', extraSyntax, 9);
hexo.extend.filter.register('after_post_render', rollbackStatics, 100);