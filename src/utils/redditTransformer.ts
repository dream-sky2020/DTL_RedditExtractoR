// 定义通用的输出格式
export interface CleanComment {
    id: string;
    author: string;
    body: string;
    image?: string;
    ups: number;
    depth: number;
    parentAuthor?: string;
    replyChain?: { author: string; content: string }[];
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

    // 展平处理评论 (现在生成带标签的文本块)
    const flattenComments = (children: any[], depth = 0, replyChain: { author: string; content: string }[] = []): CleanComment[] => {
        if (!children || !Array.isArray(children)) return [];

        let flatList: CleanComment[] = [];

        children.forEach(child => {
            if (child.kind === 't1') {
                const c = child.data;
                const { imageUrl, cleanText } = processContent(c.body || '');
                
                // 将引用链拼接成带 [quote] 标签的文本 (嵌套逻辑)
                let finalContent = cleanText;
                
                // 如果有图片，将图片标签拼接到当前评论内容的末尾 (带备注)
                if (imageUrl) {
                    finalContent += `\n[image #u/${c.author} 的附图]${imageUrl}[/image]`;
                }

                // 嵌套包装引用链：最早的引用在最外层 (带备注提示)
                for (let i = replyChain.length - 1; i >= 0; i--) {
                    const quote = replyChain[i];
                    finalContent = `[quote=${quote.author} #来自于 u/${quote.author} 的评论内容]${quote.content}\n${finalContent}[/quote]`;
                }

                // 添加当前评论
                flatList.push({
                    id: c.id,
                    author: c.author,
                    body: finalContent, // 这里的 body 现在包含了所有的引用关系
                    image: imageUrl,
                    ups: c.ups,
                    depth: depth,
                    parentAuthor: replyChain[replyChain.length - 1]?.author,
                });

                // 递归处理子评论
                if (c.replies && typeof c.replies === 'object') {
                    const subComments = flattenComments(c.replies.data.children, depth + 1, [...replyChain, { author: c.author, content: cleanText }]);
                    flatList = [...flatList, ...subComments];
                }
            }
        });

        return flatList;
    };

    const { imageUrl: postImg, cleanText: postText } = processContent(postDetail.selftext || '');

    // 构建贴子正文文本，包含图片标签
    const finalPostContent = postImg ? `${postText}\n[image]${postImg}[/image]` : postText;

    // 构建最终对象
    return {
        title: postDetail.title,
        content: finalPostContent,
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
