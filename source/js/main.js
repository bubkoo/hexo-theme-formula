seajs.config({
    base: '/',
    paths: {
        'lib': '/js/lib',
        'monitor': '/js/monitor'
    },
    alias: {
        'detector': 'js/base/detector',
        'events': 'js/base/events',
        'aspect': 'js/base/aspect',
        'monitor': 'monitor/monitor',
        'monitor-perf': 'monitor/monitor-perf',
        'monitor-dlint': 'monitor/monitor-dlint',
        'monitor-seajs': 'monitor/monitor-seajs',
        'monitor-jsniffer': 'monitor/monitor-jsniffer',
        'monitor-heat': 'monitor/monitor-heatracker'
    },
    charset: 'utf-8'
});

seajs.use([
    'monitor-perf',
    'monitor-dlint',
    'monitor-heat',
    'monitor-seajs',
    'monitor-jsniffer',
    'js/common',
    'js/toc'
]);