#!/usr/bin/env node
import { delayedDownloadDoc, delayedGetDocCommands, getLocalCookies, getLocalUserConfig, inquireAccount, inquireBooks, setJSONString, getAllNotes, } from '../lib/tool.js';
import { config as CONFIG } from './config.js';
import F from '../lib/dev/file.js';
import path from 'path';
import { getBookStacks, loginYuque } from '../lib/yuque.js';
import { Log } from '../lib/dev/log.js';
class YuqueTools {
    accountInfo;
    ctx;
    knowledgeConfig;
    userSelectedDoc;
    haveSecondLevel;
    knowledgeBaseType;
    constructor(ctx) {
        this.accountInfo = {
            userName: '',
            password: '',
        };
        this.knowledgeConfig = {
            tocRange: [],
            skipDoc: undefined,
            linebreak: undefined,
            onlyNote: false,
            latexcode: false,
            isUpdate: undefined,
            time: undefined,
        };
        this.knowledgeBaseType = 'personally';
        this.userSelectedDoc = [];
        this.haveSecondLevel = false;
        this.ctx = Object.assign(this, {
            ctx,
        });
    }
    async init(args) {
        if (!args) {
            Log.error('参数错误，退出程序');
            process.exit(0);
        }
        const isExitConfig = await F.isExit(path.resolve(CONFIG.localConfig));
        if (isExitConfig) {
            try {
                const { userName, password, ...rest } = await getLocalUserConfig();
                this.accountInfo = {
                    userName: userName,
                    password: password,
                };
                this.knowledgeBaseType = rest.host ? 'space' : 'personally';
                CONFIG.setOutputDir = rest.output ? rest.output : CONFIG.outputDir;
                this.knowledgeConfig = { ...rest };
            }
            catch (error) {
                Log.warn('配置信息有误，开始交互式环节');
            }
        }
        if (args.userName && args.password) {
            const { userName, password, ...rest } = args;
            this.accountInfo = {
                userName: userName,
                password: password,
            };
            this.knowledgeConfig = {
                ...rest,
            };
            Log.info(`当前导出操作的有效参数:`);
            args.userName && Log.info(`账号: ${args.userName}`, 2);
            args.tocRange && Log.info(`知识库: ${args.tocRange}`, 2);
            args.tocRange && Log.info(`是否跳过本地文件: ${args.skipDoc ? 'true' : 'false'}`, 2);
            args.linebreak && Log.info(`是否保持换行: ${args.linebreak ? 'true' : 'false'}`, 2);
            args.latexcode &&
                Log.info(`是否导出 LaTeX 公式为 Markdown 语法: ${args.latexcode ? 'true' : 'false'}`, 2);
            args.onlyNote && Log.info('本次只导出小记～～');
        }
        const docExit = await F.isExit(path.resolve(CONFIG.outputDir));
        let isNeedLogin = true;
        if (!docExit) {
            await F.mkdir(path.resolve(CONFIG.outputDir));
            await F.mkdir(path.resolve(CONFIG.metaDir));
        }
        if (this.exitMetaDir()) {
            const cookie = getLocalCookies();
            if (cookie && cookie?.expired > Date.now()) {
                isNeedLogin = true;
            }
            else if (cookie?.expired < Date.now()) {
                this.ask();
                return;
            }
        }
        isNeedLogin && this.start();
    }
    async exitMetaDir() {
        const docExit = await F.isExit(path.resolve(CONFIG.outputDir));
        if (!docExit) {
            await F.mkdir(path.resolve(CONFIG.outputDir));
            await F.mkdir(path.resolve(CONFIG.metaDir));
            return false;
        }
        else {
            return true;
        }
    }
    async start() {
        const { userName, password } = this.accountInfo;
        if (!userName || !password) {
            this.accountInfo = await inquireAccount();
        }
        const loginMessage = await loginYuque(this.accountInfo);
        if (loginMessage === 'ok') {
            this.ask();
        }
        else {
            Log.error(loginMessage);
            process.exit(0);
        }
    }
    async ask() {
        const { onlyNote } = this.knowledgeConfig;
        if (onlyNote) {
            await getAllNotes();
            return;
        }
        if (!(await F.isExit(CONFIG.bookInfoFile))) {
            await this.getBook();
            return;
        }
        const localBook = F.read(CONFIG.bookInfoFile);
        const { expired, booksInfo: bookList } = JSON.parse(localBook);
        if (!expired || expired < Date.now()) {
            Log.info('开始获取知识库信息');
            await this.getBook();
        }
        else {
            const targetTocList = await this.getTocList();
            if (targetTocList.length === 0) {
                Log.error('未匹配或未选择知识库，程序中断');
                process.exit(0);
            }
            else {
                const filterBookList = bookList.filter((item) => targetTocList.includes(item.slug));
                await delayedDownloadDoc(this.ctx, filterBookList);
            }
        }
    }
    async getTocList() {
        const { tocRange = [] } = this.knowledgeConfig;
        if (tocRange.length) {
            const book = F.read(CONFIG.bookInfoFile);
            const { booksInfo } = JSON.parse(book);
            if (tocRange.includes('all')) {
                return booksInfo.map((item) => item.slug);
            }
            else {
                const tocTopLevel = [];
                for (const ch of tocRange) {
                    if (/\//.test(ch)) {
                        this.haveSecondLevel = true;
                        tocTopLevel.push(ch.split('/').at(0));
                    }
                    else {
                        tocTopLevel.push(ch);
                    }
                }
                const regex = new RegExp(tocTopLevel.join('|'));
                const matchToc = booksInfo.filter((item) => {
                    return regex.test(item.name);
                });
                this.userSelectedDoc = matchToc.length
                    ? matchToc.map((item) => item.slug)
                    : [];
            }
        }
        else {
            const { tocList: userTocRange, skipDoc, linebreak, latexcode } = await inquireBooks();
            this.userSelectedDoc = userTocRange;
            this.knowledgeConfig = {
                ...this.knowledgeConfig,
                skipDoc,
                linebreak,
                latexcode,
            };
        }
        return this.userSelectedDoc;
    }
    async getBook() {
        setTimeout(async () => {
            const bookList = await getBookStacks(this.ctx);
            delayedGetDocCommands(this.ctx, bookList, async (_bookList) => {
                const content = setJSONString({ booksInfo: _bookList, expired: Date.now() + 3600000 });
                await F.touch2(CONFIG.bookInfoFile, content);
                Log.info('生成成功！！！！！');
                this.ask();
            });
        }, 300);
    }
}
export default YuqueTools;
