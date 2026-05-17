import { ItemAnimationType, SceneLayoutType, VideoScene } from '../types';

type AttrMap = Record<string, string>;

const ATTR_RE = /([a-zA-Z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

export const parseAttrs = (input: string): AttrMap => {
  const attrs: AttrMap = {};
  let match: RegExpExecArray | null;

  while ((match = ATTR_RE.exec(input)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value;
  }

  return attrs;
};

const escapeAttr = (value: string): string => value.replace(/"/g, '&quot;');

const DSL_LINE_BREAK_TOKEN = '[#\\n#]';

const encodeDslLineBreaks = (content: string): string =>
  content.replace(/\r\n/g, '\n').replace(/\n/g, DSL_LINE_BREAK_TOKEN);

const decodeDslLineBreaks = (content: string): string =>
  content.replace(new RegExp(DSL_LINE_BREAK_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\n');

const normalizeItemContent = (content: string): string => {
  let normalized = decodeDslLineBreaks(content).replace(/\r\n/g, '\n');
  normalized = normalized.replace(/^\n+/, '').replace(/\n+$/, '');
  return normalized;
};

const buildItemId = (idx: number): string =>
  `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;

const ITEM_ANIMATION_SET: ReadonlySet<ItemAnimationType> = new Set([
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
]);

const SCENE_LAYOUT_SET: ReadonlySet<SceneLayoutType> = new Set(['top', 'center', 'bottom']);

const parseOptionalSeconds = (value: string | undefined): number | undefined => {
  if (value == null || value.trim() === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return num;
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (value == null || value.trim() === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

const parseOptionalBoolean = (value: string | undefined): boolean | undefined => {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const parseOptionalAnimation = (value: string | undefined): ItemAnimationType | undefined => {
  if (!value) return undefined;
  if (ITEM_ANIMATION_SET.has(value as ItemAnimationType)) {
    return value as ItemAnimationType;
  }
  return undefined;
};

export interface SceneDslWarning {
  message: string;
  suggestion: string;
}

export type ParseSceneDslResult =
  | { ok: true; scene: VideoScene; warnings: SceneDslWarning[] }
  | { ok: false; error: string };

export const sceneToDsl = (scene: VideoScene): string => {
  const layout = SCENE_LAYOUT_SET.has((scene.layout || 'top') as SceneLayoutType)
    ? (scene.layout as SceneLayoutType)
    : 'top';
  const sceneAttrs = [
    `id="${escapeAttr(scene.id)}"`,
    `duration=${scene.duration}`,
    `type="${scene.type}"`,
    `layout="${layout}"`,
    `title="${escapeAttr(scene.title || '')}"`,
  ];

  if (scene.itemSpacing !== undefined) {
    sceneAttrs.push(`itemSpacing=${scene.itemSpacing}`);
  }

  if (scene.backgroundColor) {
    sceneAttrs.push(`bg="${escapeAttr(scene.backgroundColor)}"`);
  }

  if (scene.animateFrom) sceneAttrs.push(`animateFrom="${escapeAttr(scene.animateFrom)}"`);
  if (scene.animateTo) sceneAttrs.push(`animateTo="${escapeAttr(scene.animateTo)}"`);
  if (scene.animateStart !== undefined) sceneAttrs.push(`animateStart=${scene.animateStart}`);
  if (scene.animateDuration !== undefined) sceneAttrs.push(`animateDuration=${scene.animateDuration}`);
  if (scene.animateEasing) sceneAttrs.push(`animateEasing="${escapeAttr(scene.animateEasing)}"`);
  if (scene.offset) sceneAttrs.push(`offset="${escapeAttr(scene.offset)}"`);
  if (scene.keyframes) sceneAttrs.push(`keyframes="${escapeAttr(scene.keyframes)}"`);
  if (scene.backgroundImage) sceneAttrs.push(`bgImage="${escapeAttr(scene.backgroundImage)}"`);
  if (scene.backgroundImageMode) sceneAttrs.push(`bgMode="${escapeAttr(scene.backgroundImageMode)}"`);

  const itemBlocks = scene.items
    .map((item) => {
      const itemAttrs = [`id="${escapeAttr(item.id)}"`, `author="${escapeAttr(item.author)}"`];
      const enterAt = Number.isFinite(item.enterAt) && (item.enterAt as number) >= 0 ? item.enterAt : 0;
      const exitAt =
        Number.isFinite(item.exitAt) && (item.exitAt as number) >= 0 ? item.exitAt : scene.duration;
      const enterAnimation = item.enterAnimation || 'none';
      const exitAnimation = item.exitAnimation || 'none';
      itemAttrs.push(`enterAt=${enterAt}`);
      itemAttrs.push(`exitAt=${exitAt}`);
      itemAttrs.push(`enterAnimation="${enterAnimation}"`);
      itemAttrs.push(`exitAnimation="${exitAnimation}"`);
      if (item.backgroundColor) {
        itemAttrs.push(`bg="${escapeAttr(item.backgroundColor)}"`);
      }
      if (item.animateFrom) itemAttrs.push(`animateFrom="${escapeAttr(item.animateFrom)}"`);
      if (item.animateTo) itemAttrs.push(`animateTo="${escapeAttr(item.animateTo)}"`);
      if (item.animateStart !== undefined) itemAttrs.push(`animateStart=${item.animateStart}`);
      if (item.animateDuration !== undefined) itemAttrs.push(`animateDuration=${item.animateDuration}`);
      if (item.animateEasing) itemAttrs.push(`animateEasing="${escapeAttr(item.animateEasing)}"`);
      if (item.offset) itemAttrs.push(`offset="${escapeAttr(item.offset)}"`);
      if (item.sticky) itemAttrs.push(`sticky=true`);
      if (item.keyframes) itemAttrs.push(`keyframes="${escapeAttr(item.keyframes)}"`);
      if (item.glass !== undefined) itemAttrs.push(`glass=${item.glass ? 'true' : 'false'}`);
      if (item.glassBlur !== undefined) itemAttrs.push(`glassBlur=${item.glassBlur}`);
      if (item.glassOpacity !== undefined) itemAttrs.push(`glassOpacity=${item.glassOpacity}`);
      if (item.glassBorderColor) itemAttrs.push(`glassBorder="${escapeAttr(item.glassBorderColor)}"`);
      if (item.glassShadow) itemAttrs.push(`glassShadow="${escapeAttr(item.glassShadow)}"`);
      if (item.glassDistort !== undefined) itemAttrs.push(`glassDistort=${item.glassDistort}`);
      if (item.glassAberration !== undefined) itemAttrs.push(`glassAberration=${item.glassAberration}`);
      if (item.glassEdgeGlow) itemAttrs.push(`glassEdgeGlow="${escapeAttr(item.glassEdgeGlow)}"`);
      if (item.glassFresnel !== undefined) itemAttrs.push(`glassFresnel=${item.glassFresnel}`);
      if (item.glassGrain !== undefined) itemAttrs.push(`glassGrain=${item.glassGrain}`);
      if (item.glassRefraction !== undefined) itemAttrs.push(`glassRefraction=${item.glassRefraction}`);
      if (item.backgroundImage) itemAttrs.push(`bgImage="${escapeAttr(item.backgroundImage)}"`);
      if (item.backgroundImageMode) itemAttrs.push(`bgMode="${escapeAttr(item.backgroundImageMode)}"`);

      const content = encodeDslLineBreaks((item.content || '').trim());
      return `  <#item ${itemAttrs.join(' ')}#>\n${content ? `${content}\n` : ''}  </#item#>`;
    })
    .join('\n\n');

  return `<#scene ${sceneAttrs.join(' ')}#>\n${itemBlocks}\n</#scene#>`;
};

export const parseSceneDsl = (
  rawText: string,
  fallbackScene?: VideoScene
): ParseSceneDslResult => {
  const text = rawText.trim();
  const warnings: SceneDslWarning[] = [];
  const sceneMatch = text.match(/^<#scene\b([^#]*)#?>([\s\S]*?)<\/#scene#>\s*$/i);
  const shouldUseFallbackFields = !sceneMatch;

  const rootAttrsText = sceneMatch?.[1] ?? '';
  const body = sceneMatch?.[2] ?? text;
  if (!sceneMatch) {
    warnings.push({
      message: '未检测到合法 <#scene ...#>...</#scene#> 根节点，已按容错模式继续解析。',
      suggestion: '建议补全根节点，例如：<#scene id="scene-001" duration=8 type="comments"#>...</#scene#>。',
    });
  }

  const sceneAttrs = parseAttrs(rootAttrsText);

  let id = (sceneAttrs.id || '').trim();
  if (!id) {
    id = (fallbackScene?.id || `scene-${Date.now()}`).trim();
    warnings.push({
      message: 'scene.id 缺失，已自动补全。',
      suggestion: '建议显式设置唯一 id，如 id="scene-001"。',
    });
  }

  const typeRaw = (sceneAttrs.type || '').trim();
  let type: VideoScene['type'];
  if (typeRaw === 'post' || typeRaw === 'comments') {
    type = typeRaw;
  } else {
    type = fallbackScene?.type || 'comments';
    warnings.push({
      message: `scene.type="${typeRaw || '(空)'}" 无效，已自动回退为 "${type}"。`,
      suggestion: 'type 仅支持 "post" 或 "comments"。',
    });
  }

  const durationRaw = sceneAttrs.duration;
  const parsedDuration = Number(durationRaw);
  let duration: number;
  if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
    duration = parsedDuration;
  } else {
    duration = fallbackScene?.duration && fallbackScene.duration > 0 ? fallbackScene.duration : 5;
    warnings.push({
      message: `scene.duration="${durationRaw ?? '(空)'}" 无效，已自动回退为 ${duration}s。`,
      suggestion: '建议填写大于 0 的数字，例如 duration=8。',
    });
  }

  const title = sceneAttrs.title ?? (shouldUseFallbackFields ? fallbackScene?.title : '') ?? '';
  const backgroundColor = sceneAttrs.bg || sceneAttrs.backgroundColor || (shouldUseFallbackFields ? fallbackScene?.backgroundColor : '') || '';

  const animateFrom = sceneAttrs.animateFrom || sceneAttrs.af;
  const animateTo = sceneAttrs.animateTo || sceneAttrs.at;
  const animateStart = parseOptionalSeconds(sceneAttrs.animateStart || sceneAttrs.as);
  const animateDuration = parseOptionalSeconds(sceneAttrs.animateDuration || sceneAttrs.ad);
  const animateEasing = sceneAttrs.animateEasing || sceneAttrs.ae;
  const offset = sceneAttrs.offset || sceneAttrs.o || (shouldUseFallbackFields ? fallbackScene?.offset : undefined);
  const keyframes = sceneAttrs.keyframes || sceneAttrs.kf || (shouldUseFallbackFields ? fallbackScene?.keyframes : undefined);
  const backgroundImage = sceneAttrs.bgImage || sceneAttrs.backgroundImage || sceneAttrs.bgi || (shouldUseFallbackFields ? fallbackScene?.backgroundImage : undefined);
  const backgroundImageMode = (sceneAttrs.bgMode || sceneAttrs.backgroundImageMode || sceneAttrs.bgm || (shouldUseFallbackFields ? fallbackScene?.backgroundImageMode : undefined)) as any;

  const itemSpacingRaw = sceneAttrs.itemSpacing || sceneAttrs.is;
  let itemSpacing = itemSpacingRaw !== undefined
    ? Number(itemSpacingRaw)
    : shouldUseFallbackFields ? fallbackScene?.itemSpacing : undefined;
  if (itemSpacing !== undefined && !Number.isFinite(itemSpacing)) {
    itemSpacing = undefined;
  }

  const layoutRaw = (sceneAttrs.layout ?? '').trim();
  const fallbackLayout = fallbackScene?.layout;
  let layout: SceneLayoutType;
  if (!layoutRaw) {
    layout = fallbackLayout && SCENE_LAYOUT_SET.has(fallbackLayout) ? fallbackLayout : 'top';
  } else if (SCENE_LAYOUT_SET.has(layoutRaw as SceneLayoutType)) {
    layout = layoutRaw as SceneLayoutType;
  } else {
    layout = fallbackLayout && SCENE_LAYOUT_SET.has(fallbackLayout) ? fallbackLayout : 'top';
    warnings.push({
      message: `scene.layout="${layoutRaw}" 无效，已自动回退为 "${layout}"。`,
      suggestion: 'layout 仅支持 "top" 或 "center"。',
    });
  }

  const itemRegex = /<#item\b([^#]*)#?>([\s\S]*?)<\/#item#>/gi;
  const items: VideoScene['items'] = [];
  let itemMatch: RegExpExecArray | null;
  let index = 0;

  while ((itemMatch = itemRegex.exec(body)) !== null) {
    const itemAttrs = parseAttrs(itemMatch[1]);
    const authorRaw = (itemAttrs.author || '').trim();
    const author = authorRaw || fallbackScene?.items?.[index]?.author || `User${index + 1}`;
    if (!authorRaw) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 缺失 author，已自动补全为 "${author}"。`,
        suggestion: `建议为第 ${index + 1} 个 item 显式填写 author 属性。`,
      });
    }

    const content = normalizeItemContent(itemMatch[2]);
    const fallbackItem = fallbackScene?.items?.[index];
    const fallbackId = fallbackItem?.id;
    const itemId = (itemAttrs.id || fallbackId || buildItemId(index)).trim();
    if (!itemAttrs.id || !itemAttrs.id.trim()) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 缺失 id，已自动补全为 "${itemId}"。`,
        suggestion: `建议为第 ${index + 1} 个 item 设置稳定 id，便于后续编辑。`,
      });
    }

    const parsedEnterAt = parseOptionalSeconds(itemAttrs.enterAt);
    const parsedExitAt = parseOptionalSeconds(itemAttrs.exitAt);
    const enterAt = parsedEnterAt ?? fallbackItem?.enterAt;
    const exitAt = parsedExitAt ?? fallbackItem?.exitAt;
    if (itemAttrs.enterAt != null && parsedEnterAt == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 的 enterAt="${itemAttrs.enterAt}" 无效，已自动回退。`,
        suggestion: 'enterAt 需为大于等于 0 的数字。',
      });
    }
    if (itemAttrs.exitAt != null && parsedExitAt == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 的 exitAt="${itemAttrs.exitAt}" 无效，已自动回退。`,
        suggestion: 'exitAt 需为大于等于 0 的数字，且建议不早于 enterAt。',
      });
    }

    const parsedEnterAnimation = parseOptionalAnimation(itemAttrs.enterAnimation);
    const parsedExitAnimation = parseOptionalAnimation(itemAttrs.exitAnimation);
    const enterAnimation = parsedEnterAnimation ?? fallbackItem?.enterAnimation;
    const exitAnimation = parsedExitAnimation ?? fallbackItem?.exitAnimation;
    const itemBackgroundColor = itemAttrs.bg || itemAttrs.backgroundColor || (shouldUseFallbackFields ? fallbackItem?.backgroundColor : '') || '';

    const animateFrom = itemAttrs.animateFrom || itemAttrs.af;
    const animateTo = itemAttrs.animateTo || itemAttrs.at;
    const animateStart = parseOptionalSeconds(itemAttrs.animateStart || itemAttrs.as);
    const animateDuration = parseOptionalSeconds(itemAttrs.animateDuration || itemAttrs.ad);
    const animateEasing = itemAttrs.animateEasing || itemAttrs.ae;
    const itemOffset = itemAttrs.offset || itemAttrs.o || (shouldUseFallbackFields ? fallbackItem?.offset : undefined);
    const itemKeyframes = itemAttrs.keyframes || itemAttrs.kf || (shouldUseFallbackFields ? fallbackItem?.keyframes : undefined);
    const glass = parseOptionalBoolean(itemAttrs.glass) ?? (shouldUseFallbackFields ? fallbackItem?.glass : undefined);
    const glassBlur = parseOptionalNumber(itemAttrs.glassBlur || itemAttrs.gb) ?? (shouldUseFallbackFields ? fallbackItem?.glassBlur : undefined);
    const glassOpacity = parseOptionalNumber(itemAttrs.glassOpacity || itemAttrs.go) ?? (shouldUseFallbackFields ? fallbackItem?.glassOpacity : undefined);
    const glassBorderColor = itemAttrs.glassBorder || itemAttrs.glassBorderColor || itemAttrs.gbc || (shouldUseFallbackFields ? fallbackItem?.glassBorderColor : undefined);
    const glassShadow = itemAttrs.glassShadow || itemAttrs.gs || (shouldUseFallbackFields ? fallbackItem?.glassShadow : undefined);
    const glassDistort = parseOptionalNumber(itemAttrs.glassDistort || itemAttrs.gd) ?? (shouldUseFallbackFields ? fallbackItem?.glassDistort : undefined);
    const glassAberration = parseOptionalNumber(itemAttrs.glassAberration || itemAttrs.ga) ?? (shouldUseFallbackFields ? fallbackItem?.glassAberration : undefined);
    const glassEdgeGlow = itemAttrs.glassEdgeGlow || itemAttrs.geg || (shouldUseFallbackFields ? fallbackItem?.glassEdgeGlow : undefined);
    const glassFresnel = parseOptionalNumber(itemAttrs.glassFresnel || itemAttrs.gf) ?? (shouldUseFallbackFields ? fallbackItem?.glassFresnel : undefined);
    const glassGrain = parseOptionalNumber(itemAttrs.glassGrain || itemAttrs.gg) ?? (shouldUseFallbackFields ? fallbackItem?.glassGrain : undefined);
    const glassRefraction = parseOptionalNumber(itemAttrs.glassRefraction || itemAttrs.gr) ?? (shouldUseFallbackFields ? fallbackItem?.glassRefraction : undefined);
    const itemBackgroundImage = itemAttrs.bgImage || itemAttrs.backgroundImage || itemAttrs.bgi || (shouldUseFallbackFields ? fallbackItem?.backgroundImage : undefined);
    const itemBackgroundImageMode = (itemAttrs.bgMode || itemAttrs.backgroundImageMode || itemAttrs.bgm || (shouldUseFallbackFields ? fallbackItem?.backgroundImageMode : undefined)) as any;
    let sticky: boolean | number | undefined = shouldUseFallbackFields ? fallbackItem?.sticky : undefined;
    if (itemAttrs.sticky) {
      const num = Number(itemAttrs.sticky);
      if (!isNaN(num)) {
        sticky = num;
      } else {
        sticky = itemAttrs.sticky === 'true' || !!itemAttrs.sticky;
      }
    }

    if (itemAttrs.exitAnimation != null && parsedExitAnimation == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 的 enterAnimation="${itemAttrs.enterAnimation}" 无效，已自动回退。`,
        suggestion: 'enterAnimation 可选值：none/fade/slide-up/slide-left/zoom-in 等。',
      });
    }
    if (itemAttrs.exitAnimation != null && parsedExitAnimation == null) {
      warnings.push({
        message: `第 ${index + 1} 个 <#item#> 的 exitAnimation="${itemAttrs.exitAnimation}" 无效，已自动回退。`,
        suggestion: 'exitAnimation 可选值：none/fade/slide-down/slide-right/zoom-out 等。',
      });
    }

    items.push({
      ...(fallbackItem || {}),
      id: itemId,
      author,
      content,
      enterAt,
      exitAt,
      enterAnimation,
      exitAnimation,
      backgroundColor: itemBackgroundColor,
      animateFrom,
      animateTo,
      animateStart,
      animateDuration,
      animateEasing,
      offset: itemOffset,
      sticky,
      keyframes: itemKeyframes,
      glass,
      glassBlur,
      glassOpacity,
      glassBorderColor,
      glassShadow,
      glassDistort,
      glassAberration,
      glassEdgeGlow,
      glassFresnel,
      glassGrain,
      glassRefraction,
      backgroundImage: itemBackgroundImage,
      backgroundImageMode: itemBackgroundImageMode,
    });
    index += 1;
  }

  if (items.length === 0) {
    const fallbackItem = fallbackScene?.items?.[0];
    items.push({
      id: fallbackItem?.id || buildItemId(0),
      author: fallbackItem?.author || 'User1',
      content: normalizeItemContent(body),
      enterAt: fallbackItem?.enterAt,
      exitAt: fallbackItem?.exitAt,
      enterAnimation: fallbackItem?.enterAnimation,
      exitAnimation: fallbackItem?.exitAnimation,
      ...(fallbackItem || {}),
    });
    warnings.push({
      message: '未检测到 <#item#> 节点，已自动创建 1 个 item 并写入正文内容。',
      suggestion: '建议使用 <#item ...#>...</#item#> 包裹每个内容格，以便单独控制作者与动画。',
    });
  }

  return {
    ok: true,
    scene: {
      id,
      type,
      title,
      layout,
      backgroundColor,
      duration,
      items,
      itemSpacing,
      animateFrom,
      animateTo,
      animateStart,
      animateDuration,
      animateEasing,
      offset,
      keyframes,
      backgroundImage,
      backgroundImageMode,
    },
    warnings,
  };
};

