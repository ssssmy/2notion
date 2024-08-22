const log = console.log;
import chalk from 'chalk';
import terminalLink from 'terminal-link';
const issuesLink = 'https://github.com/vannvan/yuque-tools/issues/new';
export const Log = {
    error: (text, info) => {
        if (info) {
            const stack = new Error().stack;
            const errorBody = [
                `Node: ${process.versions.node} OS: ${process.platform}`,
                `错误信息: ${info.body}\n${stack}\n`,
                `以上信息可删除路径等隐私信息，但需要保留之后的行数哦~`,
            ];
            const errorInfo = {
                title: 'Error上报/' + info.title,
                body: errorBody.join('\n'),
            };
            const queryString = new URLSearchParams(Object.entries(errorInfo)).toString();
            const link = terminalLink('👉提个BUG(cmd/ctrl+click)', `${issuesLink}?${queryString}`);
            log(chalk.red(text + ' '.repeat(4) + link));
        }
        else {
            log(chalk.red(text));
        }
    },
    info: (text, indent) => {
        indent ? log(chalk.white(' '.repeat(indent) + text)) : log(chalk.cyan(text));
    },
    success: (text) => log(chalk.green(text)),
    warn: (text) => log(chalk.yellow(text)),
};
