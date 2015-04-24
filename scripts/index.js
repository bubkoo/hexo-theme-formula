// 指定 filter 的优先级，内置 filter 的优先级为 10，值越小越先执行

//hexo.extend.filter.register('before_post_render', require('./lib/extra-syntax'), 9);
//hexo.extend.filter.register('after_post_render', require('./lib/rollbackStatics'), 100);

hexo.on('new', require('./lib/on-new'));