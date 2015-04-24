//
module.exports = function (data) {
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
};