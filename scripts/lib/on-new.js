var child_process = require('child_process');

module.exports = function (post) {
    child_process.exec('open ' + post.path);

};
