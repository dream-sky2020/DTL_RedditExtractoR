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

    // 展平处理评论 (生成符合脚本需求的 quote 层级文本)
    const flattenComments = (children: any[], depth = 0, replyChain: { author: string; content: string }[] = []): CleanComment[] => {
        if (!children || !Array.isArray(children)) return [];

        let flatList: CleanComment[] = [];

        children.forEach(child => {
            if (child.kind === 't1') {
                const c = child.data;
                const { imageUrl, cleanText } = processContent(c.body || '');
                const currentContent = imageUrl
                    ? `${cleanText}\n[image #u/${c.author} 的附图]${imageUrl}[/image]`
                    : cleanText;

                // 祖先引用构建规则：
                // 1) 单层回复：先 quote 父评论，再写当前评论正文
                // 2) 多层回复：最外层是最近父评论，内部再嵌套更早层级
                // replyChain 顺序是 [最早, ..., 最近]，例如 [A, B] => 外层 B，内层 A
                let nestedAncestorQuote = '';
                for (let i = 0; i < replyChain.length; i++) {
                    const quote = replyChain[i];
                    const level = i + 1;
                    const inner = nestedAncestorQuote ? `\n${nestedAncestorQuote}` : '';
                    nestedAncestorQuote = `[quote=${quote.author} #第 ${level} 层级 | 来自于 u/${quote.author} 的评论内容]${quote.content}${inner}[/quote]`;
                }

                const finalContent = nestedAncestorQuote
                    ? `${nestedAncestorQuote}\n${currentContent}`.trim()
                    : currentContent;

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
                    const subComments = flattenComments(
                        c.replies.data.children,
                        depth + 1,
                        [...replyChain, { author: c.author, content: currentContent }]
                    );
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
