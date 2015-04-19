/**
 * 页面热点地图
 */
define(function (require, exports, module) {
    var M = require('monitor'),
        win = window,
        doc = win.document,
        defaultRate = 0.8,
        heatSeedAttr = 'seed',          // 热点属性名（被埋点的元素）
        rate = defaultRate,             // 采样频率，值越小越频繁，大于等于1时将不会采样
        heatBlockAttr = 'hoot',         // 热点块属性名
        defaultHeatBlock = 'default',   // 默认热点块的名称
        defaultHeatNodeId,              // 默认热点元素ID
        rateAttr = 'hoot-rate',         // 采样频率
        separator = '-',
        posCache = {},
        assignedId = false,
        scrW = screen.width,
        scrH = screen.height,
        srcDph = screen.colorDepth;

    function hasAttr(elem, attr) {
        if (!elem || 1 !== elem.nodeType) {
            return false;
        }
        if (elem.hasAttribute) {
            return elem.hasAttribute(attr);
        }
        if ('style' == attr) {
            return '' !== elem.style.cssText;
        }
        var val = elem.getAttribute(attr);
        if (null == val) {
            return false;
        } else {
            if ('function' === typeof (val)) {
                return val.toString().indexOf('function ' + attr + '()') === 0;
            } else {
                return true;
            }
        }
    }

    function preProcess() { // 如果没有指定热点块名称，则进行预处理
        var nodes = doc.getElementsByTagName('*'),
            node,
            heatBlock,
            pos,
            i,
            l = nodes.length;
        for (i = 0; i < l; i++) {
            if (hasAttr(nodes[i], heatBlockAttr)) {
                node = nodes[i];
                heatBlock = node.getAttribute(heatBlockAttr);
                pos = getNodePos(node);
                posCache[heatBlock] = pos;
                if (defaultHeatBlock === heatBlock) {
                    rate = parseFloat(node.getAttribute(rateAttr)) || defaultRate;
                } else {
                    if (0 === heatBlock.indexOf(defaultHeatBlock + separator) && !posCache.hasOwnProperty(defaultHeatBlock)) {
                        posCache[defaultHeatBlock] = pos;
                        rate = parseFloat(node.getAttribute(rateAttr)) || defaultRate;
                    }
                }
            }
        }
    }

    function getNodePos(node) {
        var x = 0,
            y = 0;
        do {
            x += node.offsetLeft;
            y += node.offsetTop;
        }
        while (node = node.offsetParent);
        return [x, y];
    }

    function getNodeSeedName(node) {
        var result;

        do if (hasAttr(node, heatSeedAttr)) {
            result = node.getAttribute(heatSeedAttr);
            break;
        }
        while (node = node.parentNode);
        return result || '';
    }

    function getHeatBlockName(node) {// 获取热点块块名称
        if (assignedId) {
            return defaultHeatNodeId;
        }
        do {
            if (hasAttr(node, heatBlockAttr)) {
                return node.getAttribute(heatBlockAttr);
            }
        }
        while (node = node.parentNode);
        return defaultHeatBlock;
    }

    function dispatchEvent(ele, evt, handler) {
        /**
         * 事件绑定
         */
        if (ele.attachEvent) {
            ele.attachEvent('on' + evt, function (args) {
                handler.call(ele, args)
            });
        } else if (ele.addEventListener) {
            ele.addEventListener(evt, handler, false);
        } else {
            ele['on' + evt] = function (args) {
                handler.call(ele, args)
            }
        }
    }


    M.heatTracker = function (id, _rate) {
        if (!M.heatTracker.invoked) {
            M.heatTracker.invoked = true;

            if ('undefined' === typeof id) {// 如果没有指定要采集的元素的 ID 则是整也热点采集
                preProcess();
                assignedId = false;
            }
            else {
                var node = doc.getElementById(id);
                if (node) {
                    posCache[defaultHeatBlock] = posCache[id] = getNodePos(node);
                    defaultHeatNodeId = id;
                    assignedId = true;
                }
                else {
                    return;
                }
                if ('undefined' === typeof _rate) {
                    rate = defaultRate;
                } else {
                    rate = parseFloat(_rate);
                    rate = isNaN(rate) ? defaultRate : rate;
                }
            }

            M.log('heat-rate:' + rate);

            if (0 === Math.floor(Math.random() / rate) && posCache.hasOwnProperty(defaultHeatBlock)) {

                console.log('heat-tracked');

                dispatchEvent(doc, 'mousedown', function (event) {
                    var e = win.event || event,
                        isLeftButton = e.which ? 1 === e.which : 1 === e.button,
                        isRightButton = e.which ? 3 === e.which : 2 === e.button,
                        ele = e.target || e.srcElement, // 触发事件的元素
                        seedName,       // 被埋点的元素的埋点名称
                        curHeatBlock,   // 当前所处的热点块
                        mousePos,       // 鼠标相对于页面的位置
                        relatedX,       // 鼠标相对于热点块的位置 X
                        relatedY;       // 鼠标相对于热点块的位置 Y


                    seedName = getNodeSeedName(ele);
                    if (!seedName) { // 没有对应的埋点
                        return;
                    }
                    if (isLeftButton || isRightButton) {// 左键或右键点击

                        curHeatBlock = getHeatBlockName(ele);
                        console.log(curHeatBlock);
                        // 获取鼠标在页面上的位置的
                        if (e.pageX) {
                            mousePos = [e.pageX , e.pageY];
                        } else {
                            if ('CSS1Compat' === doc.compatMode) {// 兼容模式
                                mousePos = [doc.documentElement.scrollLeft + e.clientX, doc.documentElement.scrollTop + e.clientY];
                            } else {
                                mousePos = [doc.body.scrollLeft + e.clientX, doc.body.scrollTop + e.clientY];
                            }
                        }
                        relatedX = mousePos[0] - posCache[curHeatBlock][0];
                        relatedY = mousePos[1] - posCache[curHeatBlock][1];

                        try {
                            M.push({
                                type: 'heatTracker',
                                block: curHeatBlock,
                                seed: seedName,
                                relatedX: relatedX,
                                relatedY: relatedY,
                                scrW: scrW,
                                scrH: scrH,
                                srcDph: srcDph
                            });
                            M.log('heat: ' + curHeatBlock + ' ^ ' + seedName + ' ^ ' + relatedX + ' ^ ' + relatedY + ' ^ ' + scrW + ' ^ ' + scrH + ' ^ ' + srcDph);
                        } catch (err) {
                            M.log('heat tracker: ' + err);
                        }
                    }
                });
            }
        }
    };

    window.setTimeout(function () {
        M.heatTracker();
    }, 100);

});