// 从 hexo 的 generate 模块看起，了解其构建过程，
// load 过程：加载读取文件到数据库中，提示 Files loaded in xxx ms
// 然后分为 theme 和 source 两个文件夹（两个 Box）进行构建


hexo.extend.filter.register('after_post_render', function (data) {

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

    // 指定 filter 的优先级为 100，内置 filter 的优先级为 10，
    // 值越小越先执行，这个 filter 需要在最后执行
}, 100);