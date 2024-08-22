import jsdom from 'jsdom';
import { getMetaUserInfo, setExpireTime, setJSONString } from './tool.js';
import { config as CONFIG } from '../core/config.js';
import { get, post } from './request.js';
import F from './dev/file.js';
import YUQUE_API from './apis.js';
import { Log } from './dev/log.js';
import { encrypt } from './dev/encrypt.js';
const { JSDOM } = jsdom;
const loginYuque = async (accountInfo) => {
    const { userName, password } = accountInfo;
    if (!userName || !password) {
        Log.error('账号信息不完整');
        process.exit(0);
    }
    const loginInfo = {
        login: userName,
        password: encrypt(password),
        loginType: 'password',
    };
    Log.info('开始登录语雀');
    try {
        const { data } = await post(YUQUE_API.mobileLoginApi, loginInfo, {
            Referer: CONFIG.host + YUQUE_API.yuqueReferer,
            origin: CONFIG.host,
            'user-agent': CONFIG.userAgent,
        });
        if (data.ok) {
            const userInfoContent = setJSONString({ ...data.me, expired: setExpireTime() });
            await F.touch2(CONFIG.userInfoFile, userInfoContent);
            Log.success('语雀登录成功');
            return 'ok';
        }
        else {
            throw '语雀登录失败，请确认账号密码是否正确';
        }
    }
    catch (error) {
        return error + ': 语雀登录失败，请确认账号密码是否正确';
    }
};
const getBookStacks = async (app) => {
    const isPersonally = app.knowledgeBaseType === 'personally';
    const { data = [] } = await get(isPersonally ? YUQUE_API.yuqueBooksList : YUQUE_API.yuqueBooksListOfSpace);
    const collabBooks = (await getCollabBooks()) || [];
    const { login: currentLogin } = await getMetaUserInfo();
    if (data.length > 0 || collabBooks.length > 0) {
        const sourceBooks = isPersonally
            ? data.map((item) => item.books).flat()
            : data;
        const _list = sourceBooks.concat(collabBooks).map((item) => {
            return {
                slug: item.slug,
                name: item.name,
                user: item.user.login,
                id: item.id,
                docs: [],
                type: currentLogin === item.user.login ? 'owner' : 'collab',
            };
        });
        return _list;
    }
    else {
        Log.error('知识库数据获取失败');
        process.exit(0);
    }
};
const getCollabBooks = async () => {
    const { data } = await get(YUQUE_API.yuqueCollabBooks);
    return data;
};
const getDocsOfBooks = async (bookId) => {
    const { data } = await get(YUQUE_API.yuqueDocsOfBook(bookId));
    if (data) {
        return data;
    }
    else {
        Log.error(`获取{${bookId}}知识库文档失败`);
    }
};
const getDocsOfSlugAndBook = async (slug, bookId) => {
    const url = await YUQUE_API.yuqueDocsOfSlugAndBook(slug, bookId);
    return get(url)
        .then((res) => {
        if (!res || !res.data) {
            return { data: undefined };
        }
        const item = res.data;
        const docDetails = {
            content_updated_at: item.content_updated_at,
            updated_at: item.updated_at,
        };
        return { data: docDetails };
    })
        .catch((error) => {
        Log.error(`获取{${slug}?book_id=${bookId}}知识库文档详情失败`, error);
        throw error;
    });
};
const getMarkdownContent = async (repos, linebreak, latexcode) => {
    const markdownContent = await get(YUQUE_API.yuqueExportMarkdown(repos, linebreak, latexcode));
    if (markdownContent) {
        return markdownContent;
    }
    else {
        Log.error(`获取{${repos}}知识库内容失败\n`);
        return '';
    }
};
const crawlYuqueBookPage = (repos) => {
    return new Promise((resolve, reject) => {
        get(repos)
            .then((res) => {
            const virtualConsole = new jsdom.VirtualConsole();
            const window = new JSDOM(`${res}`, { runScripts: 'dangerously', virtualConsole }).window;
            virtualConsole.on('error', () => {
            });
            try {
                resolve(window.appData);
            }
            catch (error) {
                Log.error(`知识库${repos}页面数据爬取失败`);
                reject([]);
            }
        })
            .catch(() => {
            Log.error(`知识库${repos}页面数据爬取失败`);
            reject([]);
        });
    });
};
const getNotes = async (offset, limit) => {
    const api = YUQUE_API.yuqueExportNotes(offset, limit);
    const data = await get(api);
    const noteRst = data;
    const notes = noteRst.notes;
    const has_more = noteRst.has_more;
    if (notes) {
        const list = notes.map((item) => {
            const tags = item.tags.map((item1) => {
                return item1.name;
            });
            return {
                content: item.content.abstract,
                tags: tags,
                slug: item.slug,
            };
        });
        return {
            list: list,
            hasMore: has_more,
        };
    }
    else {
        Log.error(`获取小记失败`);
    }
};
export { loginYuque, getBookStacks, getDocsOfBooks, getDocsOfSlugAndBook, getMarkdownContent, crawlYuqueBookPage, getNotes, };
