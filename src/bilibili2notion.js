import axios from 'axios';
import { Client } from '@notionhq/client'
import { notionConfig } from '../config/notionConfig.js'
import log4js from '../utils/log.js'
import { randomUUID } from 'crypto'

const logger = log4js.getLogger('default'); // 使用默认类别
global.logger = logger

logger.info('------------------------------- bilibili2notion -: ', randomUUID())


const config = {
    bvid: 'B***********',
    videoBase: 'https://www.bilibili.com/video/'
}

const notion = new Client({
    auth: notionConfig.connectionKey,
})

const getVideoInfo = async () => {
    return await axios({
        method: 'get',
        url: `https://api.bilibili.com/x/web-interface/view?bvid=${config.bvid}`
    })
}

const createVideo = async (videoInfo, databaseId) => {
    for (const element of videoInfo.data.data.pages) {
        const videoNo = element.page
        const videoTitle = element.part
        const videoUrl = config.videoBase + config.bvid + '?p=' + element.page
        const videoFirstFrame = element.first_frame
        await notion.pages.create({
            parent: {
                database_id: databaseId
            },
            icon: {
                emoji: '📄'
            },
            cover: {
                type: "external",
                external: {
                    url: videoFirstFrame
                }
            },
            properties: {
                Url: {
                    type: "url",
                    url: videoUrl
                },
                Remark: {
                    type: "rich_text",
                    rich_text: []
                },
                No: {
                    type: "number",
                    number: videoNo
                },
                Status: {
                    type: "select",
                    select: {
                        "name": "未观看",
                        "color": "red"
                    }
                },
                Cover: {
                    type: "files",
                    files: [
                        {
                            name: videoFirstFrame,
                            type: "external",
                            external: {
                                "url": videoFirstFrame
                            }
                        }
                    ]
                },
                Title: {
                    id: "title",
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: videoTitle,
                                link: null
                            }
                        }
                    ]
                }
            }
        })
    }
}

const createDatabase = async (videoInfo) => {
    const data = videoInfo.data.data
    const aid = data.aid; // 1906270640
    const tname = data.tname; // '  '
    const pic = data.pic; // 'http://.png'
    const title = data.title; // '  '
    const desc = data.desc; // '  '
    const res = await notion.databases.create({
        parent: {
            type: "database_id",
            database_id: notionConfig.parentId
        },
        icon: {
            type: "emoji",
            emoji: "📝"
        },
        cover: {
            type: "external",
            external: {
                url: pic
            }
        },
        title: [
            {
                type: "text",
                text: {
                    content: title,
                    link: null
                }
            }
        ],
        properties: {
            No: {
                name: "No",
                type: "number",
                number: {
                    format: "number"
                }
            },
            Title: {
                "id": "title",
                "name": "Title",
                "type": "title",
                "title": {}
            },
            Url: {
                name: "Url",
                type: "url",
                url: {}
            },
            Status: {
                select: {
                    options: [
                        { name: "已观看", color: "green" },
                        { name: "未观看", color: "red" },
                        { name: "进行中", color: "blue" }
                    ]
                }
            },
            Cover: {
                name: "Cover",
                type: "files",
                files: {}
            },
            Remark: {
                name: "Remark",
                type: "rich_text",
                rich_text: {}
            }
        },
        children: [
            {
                type: "heading_1",
                heading_1: {
                    rich_text: [
                        {
                            type: "text",
                            text: {
                                content: tname,
                                link: null
                            }
                        }
                    ],
                    color: "default"
                }
            },
            {
                type: "text",
                text: {
                    content: aid,
                    link: null
                }
            },
            {
                type: "text",
                text: {
                    content: desc,
                    link: null
                }
            }
        ]
    })
    return res.id
}

; (async () => {
    const videoInfo = await getVideoInfo()
    const databaseId = await createDatabase(videoInfo)
    await createVideo(videoInfo, databaseId)
})()