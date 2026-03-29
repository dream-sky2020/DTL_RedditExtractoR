import * as fs from 'fs';

// 定义通用的输出格式
interface CleanComment {
    id: string;
    author: string;
    body: string;
    ups: number;
    replies: CleanComment[];
}

interface CleanPost {
    title: string;
    content: string;
    author: string;
    subreddit: string;
    stats: {
        upvotes: number;
        commentCount: number;
    };
    comments: CleanComment[];
}

function parseComments(children: any[]): CleanComment[] {
    if (!children || !Array.isArray(children)) return [];

    return children
        .filter(child => child.kind === 't1') // 过滤掉 'more' 加载更多标签
        .map(child => {
            const c = child.data;
            return {
                id: c.id,
                author: c.author,
                body: c.body,
                ups: c.ups,
                // Reddit 的 replies 字段在没有回复时是空字符串，有回复时是对象
                replies: (c.replies && typeof c.replies === 'object')
                    ? parseComments(c.replies.data.children)
                    : []
            };
        });
}

function transformRedditJson(inputPath: string, outputPath: string) {
    try {
        // 1. 读取手动保存的文件
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ 找不到输入文件: ${inputPath}`);
            return;
        }
        
        const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

        // Reddit 结构：[帖子信息, 评论树]
        if (!Array.isArray(rawData) || rawData.length < 2) {
            throw new Error('输入的 Reddit JSON 格式不正确');
        }

        const [postWrapper, commentWrapper] = rawData;
        const postDetail = postWrapper.data.children[0].data;

        // 2. 构建最终对象
        const finalData: CleanPost = {
            title: postDetail.title,
            content: postDetail.selftext,
            author: postDetail.author,
            subreddit: postDetail.subreddit,
            stats: {
                upvotes: postDetail.ups,
                commentCount: postDetail.num_comments
            },
            comments: parseComments(commentWrapper.data.children)
        };

        // 3. 导出
        fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`✅ 转换完成！精简数据已保存至: ${outputPath}`);
    } catch (error: any) {
        console.error(`❌ 转换出错: ${error.message}`);
    }
}

// 执行
transformRedditJson('./raw.json', './formatted_reddit.json');