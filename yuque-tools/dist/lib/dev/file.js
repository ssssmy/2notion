import fs from 'fs';
const log = console.log;
import chalk from 'chalk';
import path from 'path';
import { Log } from './log.js';
class File {
    async mkdir(absolutePath) {
        if (fs.existsSync(absolutePath)) {
            return true;
        }
        else {
            if (this.mkdir(path.dirname(absolutePath))) {
                fs.mkdirSync(absolutePath);
                return true;
            }
            return true;
        }
    }
    async touch(absolutePath, fileName, content) {
        this.mkdir(absolutePath);
        const _fileName = `${absolutePath}/${fileName}`;
        fs.writeFile(_fileName, content, (error) => {
            if (error)
                return console.log(`${_fileName}写入文件失败,原因是` + error.message);
        });
    }
    async touch2(fileNameAbsolutePath, content) {
        if (!content)
            log(chalk.red('内容为空'));
        fs.writeFileSync(fileNameAbsolutePath, content);
    }
    rm(fullPathName) {
        fs.unlink(fullPathName, (error) => {
            if (error) {
                Log.error(`删除${fullPathName}失败`);
                process.exit(0);
            }
        });
    }
    rmdir(fullPathName) {
        let exit = fs.existsSync(fullPathName);
        if (!exit) {
            Log.warn('文件夹不存在');
            return;
        }
        fs.rmdir(fullPathName, { recursive: true }, (error) => {
            if (error) {
                Log.error(`删除${fullPathName}失败`);
                process.exit(0);
            }
        });
    }
    async isExit(fullPath) {
        return fs.existsSync(fullPath);
    }
    read(fileAbsolutePath) {
        const content = fs.readFileSync(fileAbsolutePath, 'utf-8');
        return content ? content.toString() : '';
    }
    async readDirectory(pathName, filterCallback) {
        if (!this.isExit(pathName)) {
            log(chalk.red('路径无效'));
            return false;
        }
        return new Promise((resolve) => {
            const list = [];
            const each = (pathName) => {
                fs.readdirSync(pathName).forEach((item, _index) => {
                    let stat = fs.lstatSync(path.join(pathName, item));
                    if (stat.isDirectory()) {
                        each(path.join(pathName, item));
                    }
                    else if (stat.isFile()) {
                        const fullPathName = pathName + '/' + item;
                        if (filterCallback &&
                            typeof filterCallback == 'function' &&
                            filterCallback(fullPathName)) {
                            list.push(fullPathName);
                        }
                    }
                });
            };
            each(pathName);
            resolve(list);
        });
    }
}
const F = new File();
export default F;
