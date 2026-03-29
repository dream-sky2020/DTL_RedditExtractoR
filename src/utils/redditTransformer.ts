// 定义通用的输出格式
export interface CleanComment {
    id: string;
    author: string;
    body: string;
    image?: string;
    ups: number;
    depth: number;
    parentAuthor?: string;
}

export interface CleanPost {
    title: string;
    content: string;
    image?: string;
    author: string;
    subreddit: string;
    stats: {
        upvotes: number;
        commentCount: number;
    };
    comments: CleanComment[];
}

export function transformRedditJson(rawData: any): CleanPost {
    // 如果已经是清洗过的格式，直接返回
    if (rawData && rawData.title && Array.isArray(rawData.comments) && !Array.isArray(rawData)) {
        return rawData as CleanPost;
    }

    // 原生的 Reddit 结构：[帖子信息, 评论树]
    if (!Array.isArray(rawData) || rawData.length < 2) {
        throw new Error('输入的 Reddit JSON 格式不正确');
    }

    const [postWrapper, commentWrapper] = rawData;
    const postDetail = postWrapper.data.children[0].data;

    // 辅助函数：提取并清理图片
    const processContent = (text: string) => {
        const imgRegex = /https:\/\/(?:preview|i)\.redd\.it\/[^\s)"]+/;
        const match = text.match(imgRegex);
        const imageUrl = match ? match[0].replace(/&amp;/g, '&') : '';
        const cleanText = text.replace(imgRegex, '').trim();
        return { imageUrl, cleanText };
    };

    // 展平处理评论
    const flattenComments = (children: any[], depth = 0, parentAuthor?: string): CleanComment[] => {
        if (!children || !Array.isArray(children)) return [];

        let flatList: CleanComment[] = [];

        children.forEach(child => {
            if (child.kind === 't1') {
                const c = child.data;
                const { imageUrl, cleanText } = processContent(c.body || '');
                
                // 添加当前评论
                flatList.push({
                    id: c.id,
                    author: c.author,
                    body: cleanText,
                    image: imageUrl,
                    ups: c.ups,
                    depth: depth,
                    parentAuthor: parentAuthor
                });

                // 递归处理子评论并合并到当前列表中
                if (c.replies && typeof c.replies === 'object') {
                    const subComments = flattenComments(c.replies.data.children, depth + 1, c.author);
                    flatList = [...flatList, ...subComments];
                }
            }
        });

        return flatList;
    };

    const { imageUrl: postImg, cleanText: postText } = processContent(postDetail.selftext || '');

    // 构建最终对象
    return {
        title: postDetail.title,
        content: postText,
        image: postImg,
        author: postDetail.author,
        subreddit: postDetail.subreddit,
        stats: {
            upvotes: postDetail.ups,
            commentCount: postDetail.num_comments
        },
        comments: flattenComments(commentWrapper.data.children)
    };
}
