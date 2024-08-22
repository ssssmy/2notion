import axios from 'axios';
import F from './dev/file.js';
import { getLocalCookies, getLocalUserConfig, setJSONString } from './tool.js';
import { config as CONFIG } from '../core/config.js';
import { Log } from './dev/log.js';
const getHost = async () => {
    const { host } = await getLocalUserConfig();
    return host || CONFIG.host;
};
const withBodyParamsRequest = (url, method, params, header) => {
    return new Promise(async (resolve, reject) => {
        const config = {
            url: (/login/.test(url) ? CONFIG.host : await getHost()) + url,
            method: method,
            data: params,
            headers: Object.assign(header || {}, {
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                cookie: getLocalCookies(),
            }),
        };
        axios(config)
            .then((res) => {
            if (res.headers['set-cookie']) {
                const cookieContent = setJSONString({
                    expired: Date.now(),
                    data: res.headers['set-cookie'],
                });
                F.touch2(CONFIG.cookieFile, cookieContent);
            }
            resolve(res.data);
        })
            .catch((error) => {
            Log.error(error.code, {
                title: `${method.toUpperCase()}请求出错`,
                body: `${error},${config.url}`,
            });
            reject(error.code);
        });
    });
};
export const get = (url) => {
    const cookie = getLocalCookies()?.data;
    if (!cookie) {
        Log.error('本地cookie加载失败，程序中断');
        process.exit(0);
    }
    return new Promise(async (resolve, reject) => {
        const config = {
            url: (await getHost()) + url,
            method: 'get',
            headers: {
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                cookie: cookie,
            },
        };
        axios(config)
            .then((res) => {
            resolve(res.data);
        })
            .catch((error) => {
            Log.error(error.code, { title: 'GET请求出错', body: `${error},${config.url}` });
            reject(error.code);
        });
    });
};
export const post = (url, params, header) => {
    return withBodyParamsRequest(url, 'post', params, header);
};
export const put = (url, params, header) => {
    return withBodyParamsRequest(url, 'put', params, header);
};
