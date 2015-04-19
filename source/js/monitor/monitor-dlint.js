/**
 * 校验约定的 html 书写规范
 */
define(function (require, exports, module) {
    var M = require('monitor'),
        win = window,
        doc = win.document,

        htmlErrors = [],
        duplicateIDs = [], // 重复的 ID
        duplicateIDsCache = {},

        counter = {
            doctypes: 0,
            heads: 0,
            titles: 0,
            scripts: 0,
            cssLinks: 0,
            styles: 0,
            objects: 0,
            params: 0,
            embeds: 0,
            nodes: 0
        },
        res = {
            img: [],
            css: [],
            js: [],
            fla: []
        },
        res_cache = {
            img: {},
            css: {},
            js: {},
            fla: {}
        },
        css_bg_img_cache = {},

        re_protocol = /^([a-zA-Z][a-zA-Z0-9_-]*:)/,
        re_empty_uri = /^javascript:(['"])\1;?$/,
        re_css_rel = /^stylesheet$/i,
        re_css = /\.css$/i,
        re_empty = /^\s*$/,
        re_number = /^\d+$/,
        re_css_bg_img = /^url\((["'])?(.*)\1\)$/i,

        inlinejs = ('onclick,onblur,onchange,oncontextmenu,ondblclick,onfocus,onkeydown,onkeypress,onkeyup,onmousedown,onmousemove,onmouseout,onmouseover,onmouseup,onresize,onscroll,onload,onunload,onselect,onsubmit,onbeforecopy,oncopy,onbeforecut,oncut,onbeforepaste,onpaste,onbeforeprint,onpaint,onbeforeunload').split(','),
        block = makeMap('ADDRESS,APPLET,BLOCKQUOTE,BUTTON,CENTER,DD,DEL,DIR,DIV,DL,DT,FIELDSET,FORM,FRAMESET,HR,IFRAME,INS,ISINDEX,LI,MAP,MENU,NOFRAMES,NOSCRIPT,OBJECT,OL,P,PRE,SCRIPT,TABLE,TBODY,TD,TFOOT,TH,THEAD,TR,UL'),
        inline = makeMap('A,ABBR,ACRONYM,APPLET,B,BASEFONT,BDO,BIG,BR,BUTTON,CITE,CODE,DEL,DFN,EM,FONT,I,IFRAME,IMG,INPUT,INS,KBD,LABEL,MAP,OBJECT,Q,S,SAMP,SCRIPT,SELECT,SMALL,SPAN,STRIKE,STRONG,SUB,SUP,TEXTAREA,TT,U,VAR'),

        errorCodes = {
            // 错误码
            syntaxError: 0,
            tagsIllegal: 1,
            tagUnclosed: 100,
            tagsDeprecated: 101,
            tagNameUpperCase: 102,
            tagsNestedIllegal: 103,
            titleIllegal: 104,
            attrIllegal: 2,
            protocolIllegal: 200,
            inlineJS: 201,
            inlineCSS: 202,
            attrCharsetIllegal: 203,
            attrNameIllegal: 204,
            attrValueIllegal: 205,
            attrNameDuplicated: 206,
            idDuplicated: 207,
            attrMissQuote: 208,
            relIllegal: 209,
            altIllegal: 210,
            typeIllegal: 211,
            nameIllegal: 212,
            labelForIllegal: 213,
            hrefIllegal: 214,
            flashOpacity: 215,
            documentIllegal: 3,
            doctypeIllegal: 300,
            documentCharsetIllegal: 301,
            resDuplicated: 302,
            cssByImport: 303,
            commentIllegal: 304
        },

        validateRules = {
            // 验证规则
            '*': function (node) {
                if (1 !== node.nodeType) {
                    return;
                }
                var html = D.wrapHTML(node);
                // ID 验证
                if (D.hasAttr(node, 'id')) {
                    var id = node.getAttribute('id'),
                        key;
                    if (re_empty.test(id)) {
                        log(0, D.wrapHTML(node), 'attr：[id] is empty', errorCodes.attrNameIllegal);
                    } else {
                        key = 'ID_' + id;
                        if (duplicateIDsCache.hasOwnProperty(key)) {
                            if (1 === duplicateIDsCache[key]) {
                                duplicateIDs.push(id);
                            }
                            duplicateIDsCache[key]++;
                        } else {
                            duplicateIDsCache[key] = 1;
                        }
                    }
                }
                // 行内 JS 事件绑定
                for (var i = 0, l = inlinejs.length; i < l; i++) {
                    if (D.hasAttr(node, inlinejs[i])) {
                        log(0, html, 'inline js.', errorCodes.inlineJS);
                        break;
                    }
                }
                // 背景图片
                var bg = getStyle(node, 'background-image');
                if (!!bg && 'none' !== bg) {
                    bg = bg.replace(re_css_bg_img, '$2'); // 背景图片地址
                    if (M.URI.isExternalRes(bg) && !css_bg_img_cache.hasOwnProperty(bg)) {
                        res.img.push(bg);
                        css_bg_img_cache[bg] = true;
                    }
                }
            },

            '!DOCTYPE': function () {
                counter.doctypes++;
            },

            HEAD: function (node) {
                counter.heads++;
                if (M.isIE) {
                    return;
                }
                var meta = D.firstChild(node),
                    illegal = true;
                if (meta && 'META' === meta.tagName) {
                    if (D.hasAttr(meta, 'charset')) {
                        illegal = false;
                    } else {
                        if (D.hasAttr(meta, 'http-equiv') &&
                            meta.getAttribute('http-equiv').toLowerCase() === 'content-type' &&
                            D.hasAttr(meta, 'content') &&
                            meta.getAttribute('content').indexOf('charset') >= 0) {
                            illegal = false;
                        }
                    }
                }
                if (illegal) {
                    log(0, 'document charset illegal.', 'document charset illegal.', errorCodes.documentCharsetIllegal);
                }
            },

            TITLE: function (node) {
                counter.titles++;
                if (re_empty.test(node.innerHTML)) {
                    log(0, D.outerHTML(node), 'title is empty.', errorCodes.titleIllegal)
                }
            },

            INPUT: validateButtons,

            BUTTON: validateButtons,

            SELECT: validateFormElements,

            TEXTAREA: validateFormElements,

            LABEL: function (node) {
                var html = D.wrapHTML(node);
                if (!D.hasAttr(node, 'for')) {
                    log(0, html, 'missing attr:[for]', errorCodes.labelForIllegal);
                } else {
                    var id = node.getAttribute('for');
                    if (re_empty.test(id)) {
                        log(0, html, 'attr [for] missing value.', errorCodes.labelForIllegal);
                    } else if (!duplicateIDsCache.hasOwnProperty('ID_' + id)) {
                        log(0, html, '#' + id + ' not exist.', errorCodes.labelForIllegal);
                    }
                }
            },

            SCRIPT: function (node) {
                if (D.hasAttr(node, 'src')) {
                    var html = D.wrapHTML(node),
                        src = node.getAttribute('src');
                    if (!D.hasAttr(node, 'charset')) {
                        log(0, html, 'missing charset.', errorCodes.attrCharsetIllegal);
                    }
                    if (!src || re_empty.test(src)) {
                        log(0, html, 'attr [src] is empty.', errorCodes.attrIllegal);
                    } else {
                        var uri = M.URI.path(M.URI.abs(src));
                        res.js.push(uri);
                        if (res_cache.js.hasOwnProperty(uri)) {
                            res_cache.js[uri]++;
                        } else {
                            res_cache.js[uri] = 1;
                        }
                    }
                }
            },

            LINK: function (node) {
                var type = node.getAttribute('type'),
                    rel = node.getAttribute('rel'),
                    href = node.getAttribute('href'),
                    html = D.wrapHTML(node);
                if (!D.hasAttr(node, 'rel')) {
                    log(0, html, 'missing [rel]', errorCodes.relIllegal);
                } else if ('stylesheet' != node.getAttribute('rel')) {
                    return;
                }
                if (!D.hasAttr(node, 'charset')) {
                    log(0, html, 'missing charset.', errorCodes.attrCharsetIllegal)
                }
                if (!href || re_empty.test(href)) {
                    log(0, html, 'attr [href] is empty.', errorCodes.attrIllegal);
                } else {
                    var uri = M.URI.path(M.URI.abs(href));
                    res.css.push(uri);
                    if (res_cache.css.hasOwnProperty(uri)) {
                        res_cache.css[uri]++;
                    } else {
                        res_cache.css[uri] = 1;
                    }
                }
            },

            STYLE: function (node) {
                var re = /@import\s+[^;]+;/g,
                    mat = node.innerHTML.match(re);
                if (mat) {
                    log(0, mat.join(''), 'using @import.', errorCodes.cssByImport)
                }
            },

            IFRAME: validateFrames,
            FRAME: validateFrames,

            IMG: function (node) {
                var src = node.getAttribute('src'),
                    html = D.wrapHTML(node);
                if (!D.hasAttr(node, 'alt')) {
                    log(0, html, 'missing [alt]', errorCodes.altIllegal);
                }
                if (!src || re_empty.test(src)) {
                    log(0, html, 'protocol illegal.', errorCodes.protocolIllegal);
                } else {
                    var uri = M.URI.path(M.URI.abs(src));
                    res.img.push(uri);
                    if (res_cache.img.hasOwnProperty(uri)) {
                        res_cache.img[uri]++;
                    } else {
                        res_cache.img[uri] = 1;
                    }
                }
            },

            OBJECT: function (node) {
                counter.objects++;
                if (D.hasAttr(node, 'codebase')) {
                    var src = node.getAttribute('codebase');
                    if (!src || re_empty.test(src)) {
                        log(0, '<object codebase="' + src + '"', 'attr [src] is empty.', errorCodes.attrIllegal);
                    }
                }
            },

            PARAM: function (node) {
                var html = D.wrapHTML(node);
                if ('movie' === node.getAttribute('name') || 'src' === node.getAttribute('src')) {
                    var src = node.getAttribute('value');
                    if (!src || re_empty.test(src)) {
                        log(0, html, 'attr [value] is empty.', errorCodes.attrIllegal);
                    } else {
                        var uri = M.URI.path(M.URI.abs(src));
                        res.fla.push(uri);
                        if (res_cache.fla.hasOwnProperty(uri)) {
                            res_cache.fla[uri]++;
                        } else {
                            res_cache.fla[uri] = 1;
                        }
                    }
                }
            },

            EMBED: function (node) {
                if (D.hasAttr(node, 'src')) {
                    var html = D.wrapHTML(node),
                        src = node.getAttribute('src');
                    if (!src || re_empty.test(src)) {
                        log(0, html, 'attr [src] is empty.', errorCodes.attrIllegal);
                    } else {
                        var uri = M.URI.path(M.URI.abs(src));
                        res.fla.push(uri);
                        if (res_cache.fla.hasOwnProperty(uri)) {
                            res_cache.fla[uri]++;
                        } else {
                            res_cache.fla[uri] = 1;
                        }
                    }
                }
            },

            FONT: function (node) {
                log(0, D.wrapHTML(node), 'tagName deprecated.', errorCodes.tagsDeprecated);
            },

            S: function (node) {
                log(0, D.wrapHTML(node), 'tagName deprecated.', errorCodes.tagsDeprecated);
            },

            U: function (node) {
                log(0, D.wrapHTML(node), 'tagName deprecated.', errorCodes.tagsDeprecated);
            },

            A: function (node) {
                if (!D.hasAttr(node, 'href')) {
                    var html = D.wrapHTML(node);
                    log(0, html, 'missing [href]', errorCodes.hrefIllegal);
                }
            }
        },

        D = {
            hasAttr: function (ele, attr) {
                if (!ele || 1 !== ele.nodeType) {
                    return false;
                }
                if (ele.hasAttribute) {
                    return ele.hasAttribute(attr);
                }
                if ('style' == attr) {
                    return '' !== ele.style.cssText;
                }
                var val = ele.getAttribute(attr);
                if (null == val) {
                    return false;
                } else {
                    if ('function' === typeof (val)) {
                        return val.toString().indexOf('function ' + attr + '()') === 0;
                    } else {
                        return true;
                    }
                }
            },

            outerHTML: function (node) {
                return node.outerHTML || (function (node) {
                    var parent = node.parentNode,
                        ele = doc.createElement(parent.tagName);
                    ele.appendChild(node.cloneNode(true));
                    return ele.innerHTML;
                })(node)
            },

            wrapHTML: function (node) {
                /**
                 * 获取外部包裹的 html，例如 <div id='outer'>
                 */
                var html = D.outerHTML(node),
                    idx = html.indexOf('>');
                return idx < 0 ? html : html.substr(0, idx + 1);
            },

            firstChild: function (node) {
                if (node.nodeType !== 1) {
                    return null;
                }
                for (var i = 0, l = node.childNodes.length; i < l; i++) {
                    if (node.childNodes[i].nodeType === 1) {
                        return node.childNodes[i];
                    }
                }
                return null;
            }
        };

    function byteLength(str) {
        if (!str) {
            return 0;
        }
        return str.replace(/[^\x00-\xff]/g, 'xx').length;
    }

    function makeMap(str) {
        var obj = {},
            items = str.split(',');
        for (var i = 0; i < items.length; i++) {
            obj[items[i]] = true;
        }
        return obj;
    }

    function camelize(str) {
        return str.replace(/\-+([a-z])/g, function ($0, $1) {
            return $1.toUpperCase();
        })
    }

    function getStyle(ele, style) {
        /**
         * 获取元素的样式
         */
        var s = camelize(style),
            value = ele.style[s];// 获取内联样式
        if (!value) {
            // 获取元素最终样式，兼容写法
            if (doc.defaultView && doc.defaultView.getComputedStyle) {
                var css = doc.defaultView.getComputedStyle(ele, null);
                value = css ? css.getPropertyValue(style) : null;
            } else {
                if (ele.currentStyle) {
                    value = ele.currentStyle[s];
                }
            }
        }
        // Opera提供了专门的浏览器标志 - window.opera属性
        if (win.opera && ',left,top,right,bottom,'.indexOf(',' + style + ',') >= 0) {
            if (getStyle(ele, 'position') === 'static') {
                value = 'auto';
            }
        }
        return value === 'auto' ? null : value;
    }

    function getFormName(node) {
        /**
         * 获取元素所在的表单
         */
        if (!node || !node.form) {
            return '';
        }
        var frm = node.form;
        if (frm.id) {
            return 'form#' + frm.id;
        } else {
            if (frm.name) {
                return 'form[name=' + frm.name + ']';
            } else {
                for (var i = 0, l = doc.forms.length; i < l; i++) {
                    if (doc.forms[i] == frm) {
                        return 'doc.forms[' + i + ']';
                    }
                }
            }
        }
        return 'unknow-form'
    }

    function log(line, source, msg, code) {
        htmlErrors.push({// TODO: htmlErrors 数据格式
            ln: line,
            src: source,
            msg: msg,
            code: code
        });
        M.log('DOMLint: line:' + line + ', code: ' + code + ', message:' + msg + ', source:' + source);
    }

    function validateFrames(node) {
        var src = node.getAttribute('src'),
            html;
        if (!src || re_empty.test(src)) {
            html = D.wrapHTML(node);
            log(0, html, 'attr [src] is empty.', errorCodes.attrIllegal);
        }
    }

    function validateFormElements(node) {
        var fn = getFormName(node),
            html = fn + ': ' + D.wrapHTML(node);
        if (D.hasAttr(node, 'id')) {
            var id = node.getAttribute('id');
            if ('id' === id || 'submit' === id) {
                log(0, html, '[id] attr illegal', errorCodes.attrValueIllegal)
            }
        }
        if (D.hasAttr(node, 'name')) {
            var name = node.getAttribute('name');
            if ('submit' === name) {
                log(0, html, '[name] attr illegal', errorCodes.nameIllegal)
            }
        } else {
            var type;
            if (D.hasAttr(node, 'type')) {
                type = node.getAttribute('type').toUpperCase();
            } else {
                if ('BUTTON' === node.tagName) {
                    type = 'BUTTON';
                }
            }
            if ('BUTTON' !== type && 'SUBMIT' !== type && 'IMAGE' !== type) {
                log(0, html, 'missing attr:[name]', errorCodes.nameIllegal)
            }
        }
    }

    function validateButtons(node) {
        var html = getFormName(node) + ': ' + D.wrapHTML(node);
        if (!D.hasAttr(node, 'type')) {
            log(0, html, 'missing attr:[type]', errorCodes.typeIllegal);
        }
        validateFormElements(node);
    }

    function runValidate(root, rules) {
        if (!root) {
            root = doc;
        }
        var nodes = root.getElementsByTagName('*'),
            i,
            l = nodes.length,
            node,
            tagName;
        for (i = 0; i < l; i++) {
            node = nodes[i];
            switch (node.nodeType) {
                case 1: // 元素 element
                    tagName = node.tagName.toUpperCase();
                    break;
                case 8: // 注释 comments
                    tagName = '!--';
                    break;
                case 9: // 文档 document
                    tagName = '!DOCTYPE';
                    break;
                default:
                    return;
            }
            if (rules.hasOwnProperty('*')) {
                rules['*'](node);
            }
            if (rules.hasOwnProperty(tagName)) {
                rules[tagName](node);
            }
        }
        // 节点数
        counter.nodes = l;
    }

    function globalProcessing(doc) {
        if ('BackCompat' === doc.compatMode) { // Quirks Mode 怪异模式
            log(0, doc.doctype || doc.compatMode, 'document.compatMode: ' + doc.compatMode, errorCodes.doctypeIllegal);
        }
        if (duplicateIDs.length > 0) {
            log(0, 'duplicate id:' + duplicateIDs.join(','), 'duplicate id.', errorCodes.idDuplicated);
        }
        if (M.isIE) {
            return;
        }
        if (counter.titles < 1) {
            log(0, 'missing title.', 'missing title.', errorCodes.titleIllegal);
        } else {
            if (counter.titles > 1) {
                log(0, 'too much titles.', 'too much titles.', errorCodes.titleIllegal);
            }
        }
    }

    function doLint() {
        var t = new Date();
        runValidate(doc, validateRules);
        globalProcessing(doc);
        t = new Date() - t;
        M.log('Validate DOM Time: ' + t + 'ms.');
    }

    win.setTimeout(function () {
        doLint();
        M.push({
            type: 'pageRes',
            css: res.css,
            js: res.js,
            img: res.img,
            fla: res.fla,
            htmlSize: byteLength(D.outerHTML(doc.documentElement))
        });
        if (htmlErrors && htmlErrors.length > 0) {
            M.pushDOMLint(htmlErrors);
        }
    }, 10);
});