import axios from 'axios';
import * as fs from 'fs';

interface RedditExport {
    title: string;
    selftext: string;
    author: string;
    score: number;
    url: string;
    comments: any[];
}

async function exportRedditToJson(postUrl: string, fileName: string = 'reddit_post.json') {
    // 1. 处理 URL，确保以 .json 结尾
    const jsonUrl = postUrl.replace(/\/$/, "") + ".json";

    try {
        console.log(`正在从 ${jsonUrl} 获取数据...`);

        // 注意：Reddit 有时会识别并拦截默认的 axios User-Agent，建议伪装一下
        const response = await axios.get(jsonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Reddit 返回的是一个数组：[帖子主内容, 评论内容]
        const [postData, commentData] = response.data;

        const postInfo = postData.data.children[0].data;

        const result: RedditExport = {
            title: postInfo.title,
            selftext: postInfo.selftext,
            author: postInfo.author,
            score: postInfo.score,
            url: postInfo.url,
            // 递归解析评论树
            comments: parseComments(commentData.data.children)
        };

        // 2. 导出为 JSON 文件
        fs.writeFileSync(fileName, JSON.stringify(result, null, 4), 'utf8');
        console.log(`导出成功！文件已保存至: ${fileName}`);

    } catch (error) {
        console.error('导出失败:', error.message);
    }
}

/**
 * 递归处理评论及其回复
 */
function parseComments(comments: any[]): any[] {
    return comments
        .filter(c => c.kind === 't1') // 过滤掉 'more' 类型的加载更多占位符
        .map(c => {
            const data = c.data;
            return {
                author: data.author,
                body: data.body,
                score: data.score,
                // 如果有回复，递归处理
                replies: data.replies ? parseComments(data.replies.data.children) : []
            };
        });
}

// 使用示例
const targetUrl = 'https://www.reddit.com/r/javascript/comments/xxxx/your_target_post/';
exportRedditToJson(targetUrl);