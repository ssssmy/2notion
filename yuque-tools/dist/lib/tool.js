import TurndownService from 'turndown';
import inquirer from 'inquirer';
import F from './dev/file.js';
import { config as CONFIG } from '../core/config.js';
import ora from 'ora';
import { crawlYuqueBookPage, getMarkdownContent, getNotes, getDocsOfBooks } from './yuque.js';
import path from 'path';
import { Log } from './dev/log.js';
import isNil from 'lodash.isnil';
export const setExpireTime = () => Date.now() + CONFIG.localExpire;
export const getLocalUserConfig = async () => {
    const configFile = path.resolve(CONFIG.localConfig);
    const isExitConfig = await F.isExit(configFile);
    if (isExitConfig) {
        try {
            const configUserInfo = JSON.parse(F.read(configFile)) || {};
            return configUserInfo;
        }
        catch {
            return {};
        }
    }
    else {
        return {};
    }
};
export const getMetaUserInfo = async () => {
    const userInfoFile = path.resolve(CONFIG.userInfoFile);
    const isExit = await F.isExit(userInfoFile);
    if (isExit) {
        try {
            const loginUserInfo = JSON.parse(F.read(userInfoFile)) || {};
            return loginUserInfo;
        }
        catch (error) {
            return {};
        }
    }
    else {
        return {};
    }
};
export const setJSONString = (content) => JSON.stringify(content, null, 4);
export const inquireAccount = () => {
    return new Promise((resolve) => {
        inquirer
            .prompt([
            {
                type: 'input',
                name: 'userName',
                message: 'userName',
            },
            {
                type: 'password',
                name: 'password',
                message: 'password',
            },
        ])
            .then(async (answer) => {
            const { userName, password } = answer;
            if (!userName || !password) {
                Log.error('账号信息无效');
                process.exit(0);
            }
            resolve(answer);
        });
    });
};
export const getLocalCookies = () => {
    try {
        const cookie = F.read(CONFIG.cookieFile);
        if (cookie) {
            const _cookies = JSON.parse(cookie);
            return _cookies;
        }
        else {
            return undefined;
        }
    }
    catch (error) {
        return undefined;
    }
};
const getAndSetDocDetail = async (bookList) => {
    const promises = bookList.map(async (item) => ({
        bookId: item.id,
        docs: await getDocsOfBooks(item.id),
    }));
    return Promise.all(promises);
};
export const delayedGetDocCommands = async (app, bookList, finishCallBack) => {
    const { isUpdate, time } = app.knowledgeConfig;
    if (!bookList || !bookList.length) {
        Log.error('知识库数据有误');
        process.exit(0);
    }
    const spinner = ora('开始获取文档数据\n').start();
    const promises = bookList.map((item) => {
        const { slug, user } = item;
        return crawlYuqueBookPage(`/${user}/${slug}`) || {};
    });
    try {
        const res = await Promise.allSettled(promises);
        bookList.forEach((_item, bookIndex) => {
            const bookInfo = res[bookIndex].value.book || {};
            bookList[bookIndex].docs = bookInfo.toc || [];
        });
        const isNeedGetDocDetail = !isNil(isUpdate) && !isNil(time);
        if (isNeedGetDocDetail) {
            const allBooksBaseInfo = await getAndSetDocDetail(bookList);
            bookList.forEach(async (item, bookIndex) => {
                const matchBook = allBooksBaseInfo.find((_item) => _item.bookId === item.id);
                if (matchBook) {
                    bookList[bookIndex].docs.forEach((doc) => {
                        const { docs } = matchBook;
                        const matchDoc = docs.find((_doc) => _doc.slug === doc.url);
                        if (matchDoc) {
                            doc['content_updated_at'] = matchDoc.content_updated_at;
                            doc['updated_at'] = matchDoc.updated_at;
                        }
                    });
                }
            });
        }
        spinner.stop();
        Log.success('文档数据获取完成');
        typeof finishCallBack === 'function' && finishCallBack(bookList);
    }
    catch (error) {
        Log.error(error, { title: '知识库数据获取报错', body: error });
    }
};
export const inquireBooks = async () => {
    const book = F.read(CONFIG.bookInfoFile);
    if (book) {
        const { booksInfo } = JSON.parse(book);
        const options = booksInfo.map((item, index) => {
            const type = item.type === 'owner' ? '👤' : '👥';
            return {
                name: `${type}[${index + 1}]` + item.name,
                value: item.slug,
            };
        });
        return new Promise((resolve) => {
            inquirer
                .prompt([
                {
                    type: 'checkbox',
                    message: '请选择知识库(空格选中,a选中所有)',
                    name: 'tocList',
                    choices: options,
                },
                {
                    type: 'confirm',
                    message: '是否跳过本地相同文件',
                    name: 'skipDoc',
                },
                {
                    type: 'confirm',
                    message: '是否保持语雀换行(会有<br/>标签)',
                    name: 'linebreak',
                },
                {
                    type: 'confirm',
                    message: 'Latex代码是否保留',
                    name: 'latexcode',
                },
            ])
                .then(async (answer) => {
                resolve(answer);
            });
        });
    }
    else {
        Log.error('知识库数据获取失败');
        return undefined;
    }
};
const genFlatDocList = async (bookList) => {
    const ans = [];
    const each = (list) => {
        if (list) {
            list.map((doc) => {
                if (doc.type === 'DOC' && doc.visible === 1) {
                    ans.push(doc);
                }
                if (doc.children) {
                    each(doc.children);
                }
            });
        }
    };
    bookList.map((item) => {
        item &&
            item.map((subItem) => {
                if (subItem.type === 'DOC' && subItem.visible === 1) {
                    ans.push(subItem);
                }
                each(subItem.children);
            });
    });
    return ans;
};
const mkTreeTocDir = (items, id = null, pItem) => {
    return items
        .filter((item) => item['parent_uuid'] === id)
        .map((item) => {
        const regex = /[<>:"\/\\|?*\x00-\x1F]/g;
        const fullPath = pItem.name + '/' + item.title.replace(regex, '');
        if (item.type == 'TITLE' || item.child_uuid) {
            F.mkdir(CONFIG.outputDir + '/' + fullPath);
        }
        return {
            ...item,
            pslug: pItem.slug,
            user: pItem.user,
            fullPath: fullPath,
            children: mkTreeTocDir(items, item.uuid, { ...pItem, name: fullPath }),
        };
    });
};
export const delayedDownloadDoc = async (app, bookList) => {
    if (!bookList || bookList.length === 0) {
        Log.error('知识库选项无效');
        process.exit(0);
    }
    const { tocRange, skipDoc, linebreak, latexcode, isUpdate, time } = app.knowledgeConfig;
    const newInfo = bookList.map((item) => {
        F.mkdir(CONFIG.outputDir + '/' + item.name);
        return mkTreeTocDir(item.docs, '', item);
    });
    let targetTocList = [];
    let index = 0;
    targetTocList = await genFlatDocList(newInfo);
    if (app.haveSecondLevel) {
        const docDirRegex = new RegExp(tocRange.join('|'));
        targetTocList = targetTocList.filter((item) => {
            if (docDirRegex.test(item.fullPath))
                return item.fullPath;
        });
    }
    if (targetTocList.length === 0) {
        Log.warn('当前知识库下暂无文档');
        process.exit(0);
    }
    const MAX = targetTocList.length;
    const spinner = ora('导出文档任务开始\n').start();
    let reportContent = `# 导出报告 \n ---- \n`;
    Log.info(`共${MAX}个文档需要导出，预计需要${Math.ceil((MAX * CONFIG.duration) / 1000)}秒，等耐心等待~\n`);
    let timer = setInterval(async () => {
        if (index === MAX) {
            reportContent += `---- \n ## 生成时间${new Date()}`;
            const reportFilePath = CONFIG.outputDir + `/导出报告.md`;
            F.touch2(reportFilePath, reportContent);
            spinner.stop();
            Log.success(`导出文档任务结束！`);
            clearInterval(timer);
            process.exit(0);
        }
        const { pslug, user, url, title, fullPath, updated_at, content_updated_at } = targetTocList[index] || {};
        const repos = [user, pslug, url].join('/');
        spinner.text = `【${index}/${MAX}】正在导出 ${fullPath}`;
        try {
            const content = await getMarkdownContent('/' + repos, linebreak, latexcode);
            if (content) {
                const fileDir = CONFIG.outputDir + '/' + fullPath + '.md';
                const isExit = await F.isExit(fileDir);
                if (isExit) {
                    if (isUpdate &&
                        time &&
                        (updated_at || content_updated_at) &&
                        (new Date(updated_at).getTime() >= new Date(time).getTime() ||
                            new Date(content_updated_at).getTime() >= new Date(time).getTime())) {
                        F.touch2(fileDir, content);
                        spinner.text = `【${index}/${MAX}】更新成功 ${fullPath}`;
                        reportContent += `- 🌈[${title}] 更新成功 文件路径${fileDir} \n`;
                    }
                    else if (skipDoc) {
                        spinner.text = `【${index}/${MAX}】本次跳过 ${fullPath}`;
                        reportContent += `- 🌈[${title}] 本次跳过 文件路径${fileDir} \n`;
                    }
                    else {
                        spinner.text = `【${index}/${MAX}】本次更新时间【${updated_at}】小于指定时间 ${fullPath}`;
                        reportContent += `- 🌈[${title}] 本次更新或跳过时间【${updated_at}】小于指定时间 文件路径${fileDir} \n`;
                    }
                }
                else {
                    F.touch2(fileDir, content);
                    spinner.text = `【${index}/${MAX}】导出成功 ${fullPath}`;
                    reportContent += `- 🌈[${title}] 导出完成 文件路径${fileDir} \n`;
                }
            }
            else {
                reportContent += `- ❌[${title}] 导出失败，非Markdown类型文档  \n`;
            }
        }
        catch (error) {
            reportContent += `- ❌[${title}] 导出失败，非Markdown类型文档 \n`;
        }
        index++;
    }, CONFIG.duration);
};
export const getAllNotes = async () => {
    var turndownService = new TurndownService();
    let count = -1;
    const limit = 50;
    let index = 0;
    const spinner = ora('导出小记任务开始\n').start();
    let reportContent = `# 导出报告 \n ---- \n`;
    let has_more = true;
    const notePath = CONFIG.outputDir + '/notes/';
    F.mkdir(notePath);
    let timer = setInterval(async () => {
        if (!has_more) {
            reportContent += `---- \n ## 生成时间${new Date()}`;
            const reportFilePath = CONFIG.outputDir + `/导出报告.md`;
            F.touch2(reportFilePath, reportContent);
            spinner.stop();
            Log.success(`导出文档任务结束,共导出${index}个文档`);
            clearInterval(timer);
            process.exit(0);
        }
        try {
            count += 1;
            const offset = count * limit;
            const { list, hasMore } = await getNotes(offset, limit);
            has_more = hasMore;
            for (const item of list) {
                const { content, slug, tags } = item;
                const title = slug;
                const fullPath = slug;
                spinner.text = `正在导出[${title}]`;
                let markdown = turndownService.turndown(content);
                if (markdown) {
                    const fileDir = notePath + fullPath + '.md';
                    const isExit = await F.isExit(fileDir);
                    if (isExit) {
                        spinner.text = `本次跳过[${title}]`;
                        reportContent += `- 🌈[${title}] 本次跳过 文件路径${fileDir} \n`;
                    }
                    else {
                        const tagsString = tags.map((tag) => `#${tag}`).join(' ');
                        markdown = tagsString + '\n' + markdown;
                        F.touch2(fileDir, markdown);
                        reportContent += `- 🌈[${title}] 导出完成 文件路径${fileDir} \n`;
                    }
                }
                else {
                    reportContent += `- ❌[${title}] 导出失败  \n`;
                }
                index++;
            }
        }
        catch (error) {
            reportContent += `- ❌导出失败 \n`;
        }
    }, 1000);
};
