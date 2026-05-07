import { EasingType } from './parser/types';
import { ItemAnimationType, SceneLayoutType } from '../types';

export type PropertyType = 'string' | 'number' | 'boolean' | 'select' | 'color' | 'css' | 'keyframes';

export interface PropertyMetadata {
  name: string;
  label: string;
  type: PropertyType;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  alias?: string[]; // 用于解析时的别名
}

export interface TagMetadata {
  tagName: string;
  syntax: 'angle' | 'square'; // <...> 为 angle, [...] 为 square
  properties: PropertyMetadata[];
  hasContent?: boolean; // 是否有内容，如 [image]url[/image]
  contentLabel?: string;
  contentPlaceholder?: string;
}

const EASING_OPTIONS = [
  { label: '线性 (linear)', value: 'linear' },
  { label: '渐入 (ease-in)', value: 'ease-in' },
  { label: '渐出 (ease-out)', value: 'ease-out' },
  { label: '渐入渐出 (ease-in-out)', value: 'ease-in-out' },
  { label: '弹跳 (bounce)', value: 'bounce' },
  { label: '弹性 (elastic)', value: 'elastic' },
  { label: '强调减速 (cubic-bezier)', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
];

const ANIMATION_OPTIONS = [
  { label: '无 (none)', value: 'none' },
  { label: '淡入 (fade)', value: 'fade' },
  { label: '向上滑入 (slide-up)', value: 'slide-up' },
  { label: '向下滑入 (slide-down)', value: 'slide-down' },
  { label: '向左滑入 (slide-left)', value: 'slide-left' },
  { label: '向右滑入 (slide-right)', value: 'slide-right' },
  { label: '放大 (zoom-in)', value: 'zoom-in' },
  { label: '缩小 (zoom-out)', value: 'zoom-out' },
];

export const TAGS_METADATA: Record<string, TagMetadata> = {
  'scene': {
    tagName: 'scene',
    syntax: 'angle',
    properties: [
      { name: 'id', label: '场景ID', type: 'string', placeholder: 'scene-001' },
      { name: 'duration', label: '持续时间(s)', type: 'number', min: 0.1, step: 0.1, defaultValue: 5 },
      { name: 'type', label: '场景类型', type: 'select', options: [{ label: '帖子', value: 'post' }, { label: '评论', value: 'comments' }], defaultValue: 'comments' },
      { name: 'layout', label: '布局', type: 'select', options: [{ label: '顶部', value: 'top' }, { label: '居中', value: 'center' }, { label: '底部', value: 'bottom' }], defaultValue: 'top' },
      { name: 'title', label: '标题', type: 'string' },
      { name: 'bg', label: '背景颜色', type: 'color', alias: ['backgroundColor'] },
      { name: 'itemSpacing', label: '项目间距', type: 'number', min: 0, step: 1, defaultValue: 12, alias: ['is'] },
      { name: 'af', label: '动画起始', type: 'css', alias: ['animateFrom'], placeholder: 'opacity: 0; y: 20; scaleX: 0.8; scaleY: 0.8; rotate: -8' },
      { name: 'at', label: '动画结束', type: 'css', alias: ['animateTo'], placeholder: 'opacity: 1; y: 0; scaleX: 1; scaleY: 1; rotate: 0' },
      { name: 'as', label: '动画开始时间', type: 'number', min: 0, step: 0.1, alias: ['animateStart'] },
      { name: 'ad', label: '动画时长', type: 'number', min: 0, step: 0.1, alias: ['animateDuration'] },
      { name: 'ae', label: '动画缓动', type: 'select', options: EASING_OPTIONS, alias: ['animateEasing'] },
      { name: 'o', label: '偏移', type: 'css', alias: ['offset'], placeholder: 'x: 10; y: 20' },
      { name: 'kf', label: '关键帧动画', type: 'keyframes', alias: ['keyframes'], placeholder: '0: opacity: 0, y: 20, rotate: -8; 0.5 @ease-out: scaleX: 1.1, scaleY: 1.1; 1 @cubic-bezier(0.22, 1, 0.36, 1): opacity: 1, y: 0, rotate: 0' },
    ],
    hasContent: true,
    contentLabel: '场景内容',
  },
  'item': {
    tagName: 'item',
    syntax: 'angle',
    properties: [
      { name: 'id', label: '项目ID', type: 'string' },
      { name: 'author', label: '作者', type: 'string' },
      { name: 'enterAt', label: '进入时间(s)', type: 'number', min: 0, step: 0.1 },
      { name: 'exitAt', label: '退出时间(s)', type: 'number', min: 0, step: 0.1 },
      { name: 'enterAnimation', label: '进入动画', type: 'select', options: ANIMATION_OPTIONS },
      { name: 'exitAnimation', label: '退出动画', type: 'select', options: ANIMATION_OPTIONS },
      { name: 'bg', label: '背景颜色', type: 'color', alias: ['backgroundColor'] },
      { name: 'af', label: '动画起始', type: 'css', alias: ['animateFrom'], placeholder: 'opacity: 0; y: 20; scaleX: 0.8; scaleY: 0.8; rotate: -8' },
      { name: 'at', label: '动画结束', type: 'css', alias: ['animateTo'], placeholder: 'opacity: 1; y: 0; scaleX: 1; scaleY: 1; rotate: 0' },
      { name: 'as', label: '动画开始时间', type: 'number', min: 0, step: 0.1, alias: ['animateStart'] },
      { name: 'ad', label: '动画时长', type: 'number', min: 0, step: 0.1, alias: ['animateDuration'] },
      { name: 'ae', label: '动画缓动', type: 'select', options: EASING_OPTIONS, alias: ['animateEasing'] },
      { name: 'o', label: '偏移', type: 'css', alias: ['offset'], placeholder: 'x: 10; y: 20' },
      { name: 'kf', label: '关键帧动画', type: 'keyframes', alias: ['keyframes'], placeholder: '0: opacity: 0, y: 20, rotate: -8; 0.5 @ease-out: scaleX: 1.1, scaleY: 1.1; 1 @cubic-bezier(0.22, 1, 0.36, 1): opacity: 1, y: 0, rotate: 0' },
      { name: 'sticky', label: '强制居中', type: 'boolean', description: '使该项强制在场景中心，其他项自动让位' },
    ],
    hasContent: true,
    contentLabel: '项目正文',
  },
  'image': {
    tagName: 'image',
    syntax: 'square',
    properties: [
      { name: 'w', label: '宽度', type: 'string', alias: ['width'], placeholder: '100% 或 500' },
      { name: 'h', label: '高度/最大高度', type: 'number', alias: ['mh', 'max-height', 'height'] },
      { name: 'mode', label: '填充模式', type: 'select', options: [
        { label: '自适应 (contain)', value: 'contain' },
        { label: '裁剪 (cover)', value: 'cover' },
        { label: '拉伸 (fill)', value: 'fill' }
      ], defaultValue: 'contain' },
      { name: 'pos', label: '位置', type: 'string', placeholder: 'center, top, bottom...' },
      { name: 'mt', label: '上边距', type: 'number', alias: ['marginTop'] },
      { name: 'mb', label: '下边距', type: 'number', alias: ['marginBottom'] },
    ],
    hasContent: true,
    contentLabel: '图片URL',
    contentPlaceholder: 'https://...',
  },
  'style': {
    tagName: 'style',
    syntax: 'square',
    properties: [
      { name: 'color', label: '文字颜色', type: 'color' },
      { name: 'size', label: '字号', type: 'number', min: 1, defaultValue: 24 },
      { name: 'align', label: '对齐方式', type: 'select', options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' }
      ] },
      { name: 'b', label: '加粗', type: 'boolean' },
      { name: 'i', label: '斜体', type: 'boolean' },
      { name: 'u', label: '下划线', type: 'boolean' },
    ],
    hasContent: true,
    contentLabel: '样式文本',
  },
  'row': {
    tagName: 'row',
    syntax: 'square',
    properties: [
      { name: 'gap', label: '间距', type: 'string', defaultValue: '8' },
      { name: 'align', label: '垂直对齐', type: 'select', options: [
        { label: '起点', value: 'start' },
        { label: '居中', value: 'center' },
        { label: '终点', value: 'end' },
        { label: '基线', value: 'baseline' },
        { label: '拉伸', value: 'stretch' }
      ], defaultValue: 'center' },
      { name: 'justify', label: '水平分布', type: 'select', options: [
        { label: '起点', value: 'start' },
        { label: '居中', value: 'center' },
        { label: '终点', value: 'end' },
        { label: '两端对齐', value: 'between' },
        { label: '平均分布', value: 'around' }
      ], defaultValue: 'start' },
    ],
    hasContent: true,
    contentLabel: '行内内容',
  },
  'animate': {
    tagName: 'animate',
    syntax: 'square',
    properties: [
      { name: 'from', label: '起始状态', type: 'css', placeholder: 'opacity: 0; x: -20; scaleX: 0.8; scaleY: 0.8; rotate: -8' },
      { name: 'to', label: '结束状态', type: 'css', placeholder: 'opacity: 1; x: 0; scaleX: 1; scaleY: 1; rotate: 0' },
      { name: 'kf', label: '关键帧动画', type: 'keyframes', alias: ['keyframes'], placeholder: '0: opacity: 0, x: -20; 0.5 @ease-out: rotate: 8; 1 @cubic-bezier(0.22, 1, 0.36, 1): opacity: 1, x: 0, rotate: 0' },
      { name: 'start', label: '开始时间(s)', type: 'number', min: 0, step: 0.1, defaultValue: 0 },
      { name: 'duration', label: '时长(s)', type: 'number', min: 0, step: 0.1, defaultValue: 1 },
      { name: 'easing', label: '缓动函数', type: 'select', options: EASING_OPTIONS, defaultValue: 'ease-out' },
    ],
    hasContent: true,
    contentLabel: '动画内容',
  },
  'quote': {
    tagName: 'quote',
    syntax: 'square',
    properties: [
      { name: 'author', label: '作者', type: 'string' },
      { name: 'max', label: '最大字数', type: 'number', min: 1 },
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'depth', label: '嵌套深度', type: 'number', min: 1 },
      { name: 'size', label: '字号', type: 'number' },
      { name: 'color', label: '颜色', type: 'color' },
      { name: 'bg', label: '背景颜色', type: 'color' },
      { name: 'bc', label: '边框颜色', type: 'color', alias: ['bordercolor'] },
      { name: 'bold', label: '加粗', type: 'boolean' },
      { name: 'italic', label: '斜体', type: 'boolean' },
    ],
    hasContent: true,
    contentLabel: '引用内容',
  },
  'gallery': {
    tagName: 'gallery',
    syntax: 'square',
    properties: [
      { name: 'duration', label: '默认停留时长(s)', type: 'number', min: 0.1, step: 0.1, defaultValue: 2.5 },
    ],
    hasContent: true,
    contentLabel: '图片列表 (url|duration,...)',
  }
};

export const getMetadataForTag = (tagName: string): TagMetadata | undefined => {
  return TAGS_METADATA[tagName.toLowerCase()];
};

export const getAllTags = (): string[] => {
  return Object.keys(TAGS_METADATA);
};
