import React from 'react';

export type NodeType = 'text' | 'quote' | 'image' | 'gallery' | 'style' | 'row' | 'depthLimit' | 'animate';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';

export interface BaseNode {
  type: NodeType;
}

export interface AnimateNode extends BaseNode {
  type: 'animate';
  from: React.CSSProperties;
  to: React.CSSProperties;
  keyframes?: string;
  start: number;
  duration: number;
  easing: string;
  children: ASTNode[];
}

export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

export interface DepthLimitNode extends BaseNode {
  type: 'depthLimit';
  authorChain: string[];
}

export interface QuoteNode extends BaseNode {
  type: 'quote';
  author: string;
  maxLimit: number;
  itemId?: string;
  customStyle: React.CSSProperties;
  glass?: boolean;
  glassBlur?: number;
  glassOpacity?: number;
  glassBorderColor?: string;
  glassShadow?: string;
  glassDistort?: number;
  glassAberration?: number;
  glassEdgeGlow?: string;
  glassFresnel?: number;
  glassGrain?: number;
  glassRefraction?: number;
  children: ASTNode[];
}

export interface MediaItem {
  url: string;
  duration: number;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  attrStr: string;
  mediaItems: MediaItem[];
}

export interface GalleryNode extends BaseNode {
  type: 'gallery';
  attrStr: string;
  mediaItems: MediaItem[];
}

export interface StyleNode extends BaseNode {
  type: 'style';
  style: React.CSSProperties;
  children: ASTNode[];
}

export interface RowNode extends BaseNode {
  type: 'row';
  style: React.CSSProperties;
  mediaAttrStr?: string;
  children: ASTNode[];
}

export type ASTNode = 
  | TextNode 
  | DepthLimitNode
  | QuoteNode 
  | ImageNode 
  | GalleryNode 
  | StyleNode 
  | RowNode
  | AnimateNode;
