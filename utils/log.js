import log4js from 'log4js';

const { configure } = log4js;

// 日志配置
configure({
    appenders: {
        // 控制台输出
        consoleAppender: { 
            type: 'console' 
        },
        // 文件输出
        fileAppender: {
            type: 'dateFile',
            filename: './logs/default',  //日志文件的存储名
            alwaysIncludePattern: true,  //（可选，默认false）将模式包含在当前日志文件的名称以及备份中
            pattern: "yyyy-MM-dd.log",
            encoding: 'utf-8', //（可选，默认为utf-8）文件数据的存储编码
            maxLogSize: 1024 * 1024 * 1 // 文件最大存储空间
        }
    },
    categories: {
        // 设置默认所有日志都记录
        default: { 
            appenders: ['consoleAppender', 'fileAppender'], 
            level: 'all' 
        } 
    }
});
 
export default log4js