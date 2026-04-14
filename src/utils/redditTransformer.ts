// 定义通用的输出格式
export interface CleanComment {
    id: string;
    author: string;
    body: string;
    image?: string;
    ups: number;
    depth: number;
    createdUtc?: number;
    controversiality?: number;
    parentAuthor?: string;
    replyChain?: { author: string; id?: string; content: string }[];
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

export type CommentSortMode = 'best' | 'top' | 'new' | 'old' | 'controversial';
export type ReplyOrderMode = 'preserve' | 'global';
export interface AuthorProfile {
    alias?: string;
    color?: string;
}

export interface TransformOptions {
    sortMode?: CommentSortMode;
    replyOrder?: ReplyOrderMode;
    authorProfiles?: Record<string, AuthorProfile>;
    imageLayoutMode?: 'gallery' | 'row' | 'single';
}

const AUTHOR_TAG_COLOR = '#1890ff';
const normalizeAuthor = (author?: string) => (author && author.trim() ? author.trim() : '[deleted]');
const normalizeAuthorToken = (author?: string) =>
    normalizeAuthor(author).replace(/[#[\]\s]/g, '_') || 'user';

const getAuthorProfile = (author: string, profiles: Record<string, AuthorProfile>) =>
    profiles[normalizeAuthor(author)] || {};
const getAuthorDisplayName = (author: string, profiles: Record<string, AuthorProfile>) => {
    const profile = getAuthorProfile(author, profiles);
    const alias = profile.alias?.trim();
    return alias || normalizeAuthor(author);
};
const getAuthorColor = (author: string, profiles: Record<string, AuthorProfile>) => {
    const profile = getAuthorProfile(author, profiles);
    const color = profile.color?.trim();
    return color || AUTHOR_TAG_COLOR;
};
const buildAuthorHeader = (author: string, profiles: Record<string, AuthorProfile>) => {
    const displayName = getAuthorDisplayName(author, profiles);
    const color = getAuthorColor(author, profiles);
    return `[style color=${color} b]u/${displayName}:[/style]`;
};

const stripLeadingAuthorHeader = (content: string) =>
    content.replace(/^\[style[^\]]*\]u\/[^:\]]+:\[\/style\]\s*/i, '');

const prependAuthorHeader = (author: string, content: string, profiles: Record<string, AuthorProfile>) => {
    const header = buildAuthorHeader(author, profiles);
    const normalized = (content || '').trim();
    if (!normalized) return header;
    if (normalized.startsWith(header)) return normalized;
    const withoutOldHeader = stripLeadingAuthorHeader(normalized);
    return `${header} ${withoutOldHeader}`;
};

const normalizeCreatedUtc = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};
const normalizeNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};
const getCommentScore = (comment: Partial<CleanComment>) => normalizeNumber(comment.ups);
const getCommentTime = (comment: Partial<CleanComment>) => normalizeCreatedUtc(comment.createdUtc);
const getCommentControversiality = (comment: Partial<CleanComment>) =>
    normalizeNumber(comment.controversiality);

const compareCleanComments = (a: Partial<CleanComment>, b: Partial<CleanComment>, sortMode: CommentSortMode) => {
    const aScore = getCommentScore(a);
    const bScore = getCommentScore(b);
    const aTime = getCommentTime(a);
    const bTime = getCommentTime(b);
    const aControversiality = getCommentControversiality(a);
    const bControversiality = getCommentControversiality(b);

    switch (sortMode) {
        case 'top':
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
        case 'new':
            if (bTime !== aTime) return bTime - aTime;
            if (bScore !== aScore) return bScore - aScore;
            return 0;
        case 'old':
            if (aTime !== bTime) return aTime - bTime;
            if (bScore !== aScore) return bScore - aScore;
            return 0;
        case 'controversial':
            if (bControversiality !== aControversiality) return bControversiality - aControversiality;
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
        case 'best':
        default:
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
    }
};

const getRawCommentScore = (comment: any) => normalizeNumber(comment?.ups ?? comment?.score);
const getRawCommentTime = (comment: any) => normalizeCreatedUtc(comment?.created_utc ?? comment?.created);
const getRawCommentControversiality = (comment: any) => normalizeNumber(comment?.controversiality);

const compareRawComments = (a: any, b: any, sortMode: CommentSortMode) => {
    const aScore = getRawCommentScore(a);
    const bScore = getRawCommentScore(b);
    const aTime = getRawCommentTime(a);
    const bTime = getRawCommentTime(b);
    const aControversiality = getRawCommentControversiality(a);
    const bControversiality = getRawCommentControversiality(b);

    switch (sortMode) {
        case 'top':
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
        case 'new':
            if (bTime !== aTime) return bTime - aTime;
            if (bScore !== aScore) return bScore - aScore;
            return 0;
        case 'old':
            if (aTime !== bTime) return aTime - bTime;
            if (bScore !== aScore) return bScore - aScore;
            return 0;
        case 'controversial':
            if (bControversiality !== aControversiality) return bControversiality - aControversiality;
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
        case 'best':
        default:
            if (bScore !== aScore) return bScore - aScore;
            if (bTime !== aTime) return bTime - aTime;
            return 0;
    }
};

const sortFlatComments = (comments: CleanComment[], sortMode: CommentSortMode) =>
    [...comments].sort((a, b) => compareCleanComments(a, b, sortMode));

const DEFAULT_OPTIONS: Required<TransformOptions> = {
    sortMode: 'best',
    replyOrder: 'preserve',
    authorProfiles: {},
    imageLayoutMode: 'gallery',
};

const normalizeCleanPost = (data: CleanPost, options: Required<TransformOptions>): CleanPost => {
    const postAuthor = normalizeAuthor(data.author);
    const normalizedComments = Array.isArray(data.comments)
        ? data.comments.map((comment) => {
            const commentAuthor = normalizeAuthor(comment.author);
            const displayAuthor = getAuthorDisplayName(commentAuthor, options.authorProfiles);
            return {
                ...comment,
                author: displayAuthor,
                body: prependAuthorHeader(commentAuthor, comment.body || '', options.authorProfiles),
                parentAuthor: comment.parentAuthor
                    ? getAuthorDisplayName(normalizeAuthor(comment.parentAuthor), options.authorProfiles)
                    : comment.parentAuthor,
                createdUtc: normalizeCreatedUtc(comment.createdUtc),
                controversiality: normalizeNumber(comment.controversiality),
                replyChain: Array.isArray(comment.replyChain)
                    ? comment.replyChain.map((item) => ({
                        ...item,
                        author: getAuthorDisplayName(normalizeAuthor(item.author), options.authorProfiles),
                    }))
                    : comment.replyChain,
            };
        })
        : [];

    return {
        ...data,
        author: getAuthorDisplayName(postAuthor, options.authorProfiles),
        content: prependAuthorHeader(postAuthor, data.content || '', options.authorProfiles),
        comments: options.replyOrder === 'global'
            ? sortFlatComments(normalizedComments, options.sortMode)
            : normalizedComments,
    };
};

export function transformRedditJson(rawData: any, options: TransformOptions = {}): CleanPost {
    const mergedOptions: Required<TransformOptions> = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    // 如果已经是清洗过的格式，直接返回
    if (rawData && rawData.title && Array.isArray(rawData.comments) && !Array.isArray(rawData)) {
        return normalizeCleanPost(rawData as CleanPost, mergedOptions);
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
    const flattenComments = (
        children: any[],
        depth = 0,
        replyChain: { author: string; id?: string; content: string }[] = []
    ): CleanComment[] => {
        if (!children || !Array.isArray(children)) return [];

        let flatList: CleanComment[] = [];
        const orderedChildren = [...children].sort((left, right) => {
            const leftIsComment = left?.kind === 't1';
            const rightIsComment = right?.kind === 't1';
            if (!leftIsComment || !rightIsComment) return 0;
            return compareRawComments(left.data, right.data, mergedOptions.sortMode);
        });

        orderedChildren.forEach(child => {
            if (child.kind === 't1') {
                const c = child.data;
                const { imageUrl, cleanText } = processContent(c.body || '');
                // 因为 processContent 已经把图片转换成 [image] 标签放入 cleanText 了
                // 所以我们不需要在这里额外添加一次，否则会重复
                const commentAuthor = normalizeAuthor(c.author);
                const displayAuthor = getAuthorDisplayName(commentAuthor, mergedOptions.authorProfiles);
                const currentRawContent = cleanText;
                const currentContent = prependAuthorHeader(commentAuthor, currentRawContent, mergedOptions.authorProfiles);

                // 祖先引用构建规则：
                // 1) 最外层是最近的父评论，最内层是最早的评论
                // 2) 结构：[quote=父级] [quote=更早父级]...[/quote] \n 父级内容 [/quote]
                // 3) 最大支持 4 层嵌套以防止 UI 溢出和脚本过大
                let nestedAncestorQuote = '';
                const MAX_QUOTE_NESTING = 4;
                const startIdx = Math.max(0, replyChain.length - MAX_QUOTE_NESTING);
                
                for (let i = startIdx; i < replyChain.length; i++) {
                    const quote = replyChain[i];
                    const level = i + 1;
                    
                    // 核心修改：先放内部嵌套(inner)，再放当前引用层级的内容(quote.content)
                    // 同时在这里手动加入作者抬头，并应用 [style] 标签以便用户控制
                    const quoteAuthor = normalizeAuthor(quote.author);
                    const quoteAuthorName = getAuthorDisplayName(quoteAuthor, mergedOptions.authorProfiles);
                    const quoteAuthorToken = normalizeAuthorToken(quoteAuthorName);
                    const authorHeader = `${buildAuthorHeader(quoteAuthor, mergedOptions.authorProfiles)} `;
                    const contentPart = nestedAncestorQuote 
                        ? `\n${nestedAncestorQuote}\n${authorHeader}${stripLeadingAuthorHeader(quote.content)}` 
                        : `${authorHeader}${stripLeadingAuthorHeader(quote.content)}`;

                    const quotedIdAttr = quote.id ? ` id=${quote.id}` : '';
                    nestedAncestorQuote = `[quote=${quoteAuthorToken}${quotedIdAttr} #第 ${level} 层级 | 来自于 u/${quoteAuthorName} 的评论内容]${contentPart}[/quote]`;
                }

                const finalContent = nestedAncestorQuote
                    ? `${nestedAncestorQuote}\n${currentContent}`.trim()
                    : currentContent;

                // 添加当前评论
                flatList.push({
                    id: c.id,
                    author: displayAuthor,
                    body: finalContent, // 这里的 body 现在包含了所有的引用关系
                    image: imageUrl,
                    ups: c.ups,
                    depth: depth,
                    createdUtc: normalizeCreatedUtc(c.created_utc ?? c.created),
                    controversiality: normalizeNumber(c.controversiality),
                    parentAuthor: replyChain[replyChain.length - 1]?.author
                        ? getAuthorDisplayName(replyChain[replyChain.length - 1]?.author, mergedOptions.authorProfiles)
                        : undefined,
                });

                // 递归处理子评论
                if (c.replies && typeof c.replies === 'object' && c.replies.data) {
                    const subComments = flattenComments(
                        c.replies.data.children,
                        depth + 1,
                        [...replyChain, { author: commentAuthor, id: c.id, content: currentRawContent }]
                    );
                    flatList = [...flatList, ...subComments];
                }
            }
        });

        return flatList;
    };

    // 核心改进：多途径提取贴子主图及图集 (统一使用 [image] 标签)
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

    // 组装最终正文：将多图包装为 [image] 或 [row] 标签追加到末尾
    if (postImages.length > 1) {
        let multiImageTag = '';
        if (mergedOptions.imageLayoutMode === 'row') {
            // 如果是 row 模式，计算宽度
            const width = Math.floor(100 / Math.min(postImages.length, 3)) - 2;
            const images = postImages.map(url => `[image w=${width}%]${url}[/image]`).join('\n  ');
            multiImageTag = `\n[row gap=10 justify=center]\n  ${images}\n[/row]`;
        } else if (mergedOptions.imageLayoutMode === 'single') {
            // 如果是 single 模式，逐个排布
            multiImageTag = `\n${postImages.map(url => `[image]${url}[/image]`).join('\n')}`;
        } else {
            // 默认轮播模式：多个 URL 写进同一个 [image]
            multiImageTag = `\n[image]${postImages.join(',')}[/image]`;
        }

        if (!postText.includes('[row]')) {
            postText = `${postText}${multiImageTag}`;
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
        content: prependAuthorHeader(normalizeAuthor(postDetail.author), postText, mergedOptions.authorProfiles),
        image: postImg,
        images: postImages,
        author: getAuthorDisplayName(normalizeAuthor(postDetail.author), mergedOptions.authorProfiles),
        subreddit: postDetail.subreddit,
        stats: {
            upvotes: postDetail.ups,
            commentCount: postDetail.num_comments
        },
        comments: (() => {
            const flattened = flattenComments(commentWrapper.data.children);
            if (mergedOptions.replyOrder === 'global') {
                return sortFlatComments(flattened, mergedOptions.sortMode);
            }
            return flattened;
        })()
    };
}

export function extractAuthorsFromRawData(rawData: any): string[] {
    const users = new Set<string>();
    const addUser = (author: unknown) => users.add(normalizeAuthor(typeof author === 'string' ? author : ''));

    const walkRawComments = (children: any[]) => {
        if (!Array.isArray(children)) return;
        children.forEach((child) => {
            if (child?.kind !== 't1') return;
            const data = child.data || {};
            addUser(data.author);
            if (data.replies && typeof data.replies === 'object' && data.replies.data) {
                walkRawComments(data.replies.data.children);
            }
        });
    };

    if (Array.isArray(rawData) && rawData.length >= 2) {
        const postAuthor = rawData?.[0]?.data?.children?.[0]?.data?.author;
        addUser(postAuthor);
        walkRawComments(rawData?.[1]?.data?.children || []);
    } else if (rawData && !Array.isArray(rawData)) {
        addUser(rawData.author);
        if (Array.isArray(rawData.comments)) {
            rawData.comments.forEach((comment: any) => {
                addUser(comment?.author);
                if (Array.isArray(comment?.replyChain)) {
                    comment.replyChain.forEach((item: any) => addUser(item?.author));
                }
            });
        }
    }

    return Array.from(users).sort((a, b) => a.localeCompare(b));
}
