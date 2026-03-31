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
    images?: string[]; // 支持多图/图集
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

    // 辅助函数：提取并清理图片，支持多域名和 Reddit Giphy 标签
    const processContent = (text: string) => {
        let cleanText = text;
        let firstImageUrl = '';

        // 核心修复：先处理标准图片链接，再处理 Giphy 标签，防止嵌套
        // 1. 处理标准图片链接 (包括 i.redd.it, imgur, giphy.com 等)
        const imgRegex = /https:\/\/(?:preview|i|external-preview)\.redd\.it\/[^\s)"]+|https:\/\/i\.imgur\.com\/[^\s)"]+\.(?:jpe?g|png|gif|webp)|https:\/\/(?:media|i)\.giphy\.com\/[^\s)"]+\.gif/gi;
        
        const matches = text.match(imgRegex);
        if (matches && matches.length > 0) {
            firstImageUrl = matches[0].replace(/&amp;/g, '&');
        }

        // 将所有图片链接转换为 [image] 标签
        cleanText = cleanText.replace(imgRegex, (match) => {
            const url = match.replace(/&amp;/g, '&');
            return `\n[image]${url}[/image]\n`;
        });

        // 2. 处理 Reddit Giphy 标签: ![gif](giphy|IAcQ0KshiLKrS) -> [image]...[/image]
        // 只有当它还没被转换成标准链接时才处理（Reddit 有时会同时返回两者）
        const giphyRegex = /!\[gif\]\(giphy\|([^)]+)\)/gi;
        cleanText = cleanText.replace(giphyRegex, (match, giphyId) => {
            const url = `https://media.giphy.com/media/${giphyId}/giphy.gif`;
            if (!firstImageUrl) firstImageUrl = url;
            // 检查这个 URL 是否已经因为上面的正则被包裹过了
            if (cleanText.includes(`[image]${url}[/image]`)) {
                return ''; // 如果已经有了，就直接删掉原始标签
            }
            return `\n[image]${url}[/image]\n`;
        });

        return { imageUrl: firstImageUrl, cleanText: cleanText.trim() };
    };

    // 展平处理评论 (生成符合脚本需求的 quote 层级文本)
    const flattenComments = (children: any[], depth = 0, replyChain: { author: string; content: string }[] = []): CleanComment[] => {
        if (!children || !Array.isArray(children)) return [];

        let flatList: CleanComment[] = [];

        children.forEach(child => {
            if (child.kind === 't1') {
                const c = child.data;
                const { imageUrl, cleanText } = processContent(c.body || '');
                // 因为 processContent 已经把图片转换成 [image] 标签放入 cleanText 了
                // 所以我们不需要在这里额外添加一次，否则会重复
                const currentContent = cleanText;

                // 祖先引用构建规则：
                // 1) 最外层是最近的父评论，最内层是最早的评论
                // 2) 结构：[quote=父级] [quote=更早父级]...[/quote] \n 父级内容 [/quote]
                let nestedAncestorQuote = '';
                for (let i = 0; i < replyChain.length; i++) {
                    const quote = replyChain[i];
                    const level = i + 1;
                    
                    // 核心修改：先放内部嵌套(inner)，再放当前引用层级的内容(quote.content)
                    // 同时在这里手动加入作者抬头，并应用 [style] 标签以便用户控制
                    const authorHeader = `[style color=#1890ff b]u/${quote.author}:[/style] `;
                    const contentPart = nestedAncestorQuote 
                        ? `\n${nestedAncestorQuote}\n${authorHeader}${quote.content}` 
                        : `${authorHeader}${quote.content}`;

                    nestedAncestorQuote = `[quote=${quote.author} #第 ${level} 层级 | 来自于 u/${quote.author} 的评论内容]${contentPart}[/quote]`;
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
                if (c.replies && typeof c.replies === 'object' && c.replies.data) {
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

    // 核心改进：多途径提取贴子主图及图集 (使用 [gallery] 标签)
    let postImg = '';
    let postImages: string[] = [];
    
    // 1. 如果是图集 (Gallery)
    if (postDetail.is_gallery && postDetail.media_metadata) {
        Object.keys(postDetail.media_metadata).forEach(key => {
            const media = postDetail.media_metadata[key];
            if (media && media.s) {
                const url = media.s.u ? media.s.u.replace(/&amp;/g, '&') : media.s.gif;
                if (url) postImages.push(url);
            }
        });
        if (postImages.length > 0) postImg = postImages[0];
    } 
    // 2. 如果 post_hint 为 image 或者 URL 直接指向图片
    else if (
        postDetail.post_hint === 'image' || 
        /\.(jpe?g|png|gif|webp)$/i.test(postDetail.url) ||
        /i\.redd\.it|preview\.redd\.it|i\.imgur\.com/.test(postDetail.url)
    ) {
        postImg = postDetail.url.replace(/&amp;/g, '&');
        postImages = [postImg];
    }
    // 3. 从预览图中寻找高质量版本
    else if (postDetail.preview && postDetail.preview.images && postDetail.preview.images[0]) {
        const source = postDetail.preview.images[0].source;
        if (source) {
            postImg = source.url.replace(/&amp;/g, '&');
            postImages = [postImg];
        }
    }

    // 4. 处理正文文本
    let { imageUrl: bodyImg, cleanText: postText } = processContent(postDetail.selftext || '');
    
    // 如果没有主贴图集，但正文中有图片，使用正文图片
    if (postImages.length === 0 && bodyImg) {
        postImg = bodyImg;
        postImages = [bodyImg];
    }

    // 组装最终正文：将图集包装为 [gallery] 标签追加到末尾
    if (postImages.length > 1) {
        // 如果是多图，使用 [gallery]
        const galleryTag = `\n[gallery]${postImages.join(',')}[/gallery]`;
        if (!postText.includes('[gallery]')) {
            postText = `${postText}${galleryTag}`;
        }
    } else if (postImages.length === 1) {
        // 如果是单图，使用 [image]
        if (!postText.includes(postImages[0])) {
            postText = `${postText}\n[image]${postImages[0]}[/image]`;
        }
    }

    // 构建最终对象
    return {
        title: postDetail.title,
        content: postText.trim(),
        image: postImg,
        images: postImages,
        author: postDetail.author,
        subreddit: postDetail.subreddit,
        stats: {
            upvotes: postDetail.ups,
            commentCount: postDetail.num_comments
        },
        comments: flattenComments(commentWrapper.data.children)
    };
}
