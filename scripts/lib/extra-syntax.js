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

function escapeCode(lang, code) {
  if (injectFn[lang]) {
    code = injectFn[lang](code);
  }
  return '\n<escape>' + code + '</escape>\n';
}

function syntaxExtra(raw, start, startQuote, language, options, content, endQuote, end) {
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
  var meta = language + (options ? (' ' + options) : '');
  var native = start + '```' + meta + '\n' + content + '\n```' + end;
  var injected = escapeCode(language, content);

  return hide ? injected : (native + injected);
}

var blockTags = [
  'quote',
  'blockquote',
  'code',
  'codeblock',
  'pullquote'
];

var inlineTags = [
  'jsfiddle',
  'gist',
  'iframe',
  'img',
  'link',
  'include_code',
  'youtube',
  'vimeo',
  'post_path',
  'post_link',
  'asset_path',
  'asset_img',
  'asset_link'
];

function wrapBlockTag(language, options, content) {
  return '' +
    '{% ' + language + (options ? (' ' + options) : '') + ' %}\n' +
    content + '\n' +
    '{% end' + language + ' %}\n';
}

function wrapInlineTag(language, options) {
  return '{% ' + language + (options ? (' ' + options) : '') + ' %}';
}

function syntaxSugar(raw, language, options, content) {
  var blockIndex = blockTags.indexOf(language);
  var inlineIndex = inlineTags.indexOf(language);
  if (blockIndex === -1 && inlineIndex === -1) {
    return raw;
  }

  return blockIndex > -1
    ? wrapBlockTag(language, options, content)
    : inlineIndex > -1
    ? wrapInlineTag(language, options)
    : raw;
}

module.exports = function (data) {
  var source = data.source;
  var ext = source.substring(source.lastIndexOf('.')).toLowerCase();
  if ('.js.css.html.htm'.indexOf(ext) > -1) {
    return;
  }

  data.content = data.content
    .replace(rFenceCode, function (raw, start, startQuote, meta, content, endQuote, end) {
      if (!meta) {
        return raw;
      }

      var match = meta.match(rLang);

      var language;
      var options;
      if (match) {
        language = match[1] || '';
        options = match[2] || '';
      }

      if (!language) {
        return raw;
      }

      var quoteCount = startQuote.length;

      return quoteCount >= 4
        ? syntaxExtra(raw, start, startQuote, language, options, content, endQuote, end)
        : quoteCount === 3
        ? syntaxSugar(raw, language, options, content)
        : raw;

    });
};