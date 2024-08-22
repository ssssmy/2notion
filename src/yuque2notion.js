import { Client } from '@notionhq/client'
import matter from 'gray-matter'
import { markdownToBlocks } from '@tryfabric/martian'
import log4js from '../utils/log.js'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { ytool } from '../yuque-tools/dist/sdk/index.js'
import { notionConfig } from '../config/notionConfig.js'

export const yuqueConfig = {
    userName: 'username',
    password: 'password',
}

const notion = new Client({
    auth: notionConfig.connectionKey,
})

const logger = log4js.getLogger('default'); // 使用默认类别
global.logger = logger

logger.info('------------------------------- yuque2notion -: ', randomUUID())

let count = 0;

const readDir = (directoryPath) => {
    try {
        const files = fs.readdirSync(directoryPath);
        const filesArray = [];
        const foldersArray = [];

        files.forEach(file => {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                filesArray.push(file);
            } else if (stats.isDirectory()) {
                foldersArray.push(file);
            }
        });
        return {
            filesArray,
            foldersArray
        }
    } catch (err) {
        throw new Error('readDir:' + err)
    }
}

const loop = async (parentId, rootpath, files, folders) => {
    for (const file of files) {
        const newpage = await createPage(parentId, path.basename(file).replace(path.extname(file), ''), 'file')
        const res = readMD(path.join(rootpath, file))
        if (res && res.length > 0) {
            await createBlock(newpage.id, res)
        }
    }
    for (const element of folders) {
        const newpage = await createPage(parentId, element, 'folder')
        const rootPath = path.join(rootpath, element)
        const { filesArray, foldersArray } = readDir(rootPath)
        await loop(newpage.id, rootPath, filesArray, foldersArray)
    }
}

const createBlock = async (parentId, children) => {
    try {
        await notion.blocks.children.append({
            block_id: parentId,
            children
        })
        logger.info(`success create block: ${++count}`)
    } catch (e) {
        logger.error(`failed create block: ${e}`)
    }
}

const createPage = async (parentId, title, type) => {
    let res;
    try {
        res = await notion.pages.create({
            parent: {
                page_id: parentId
            },
            icon: {
                emoji: type === 'folder' ? '📁' : '📄'
            },
            properties: {
                title: [
                    {
                        text: {
                            content: title
                        }
                    }
                ]
            }
        })
        logger.info(`success create page ${title}`)
    } catch (e) {
        logger.error(`failed create page ${title}: ${e}`)
    }
    return res;
}

const removeMarkdownLinks = (content) => {
    const linkPattern = /\[([^\]]+)]\(#([^)]+)\)/g
    return content.replace(linkPattern, '$1')
}

const readMD = (fileFullPath) => {
    let res;
    try {
        const content = matter(fs.readFileSync(fileFullPath, 'utf-8')).content
        const noLinkContent = removeMarkdownLinks(content)
        res = markdownToBlocks(noLinkContent)
        logger.info(`success create readMD `)
    } catch (e) {
        logger.error(`failed create readMD : ${e}`)
    }
    return res;
}

; (async () => {
    await ytool.init({
        ...yuqueConfig,
        tocRange: ['all'],
        skipDoc: false,
        linebreak: false,
        latexcode: true,
    })
    const relativePath = './docs';
    const absolutePath = path.resolve(relativePath);
    const { filesArray, foldersArray } = readDir(absolutePath)
    await loop(notionConfig.parentId, absolutePath, filesArray, foldersArray)
})()