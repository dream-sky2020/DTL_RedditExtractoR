import React from 'react';

export type NodeType = 'text' | 'quote' | 'image' | 'gallery' | 'style' | 'audio' | 'row';

export interface BaseNode {
  type: NodeType;
}

export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

export interface QuoteNode extends BaseNode {
  type: 'quote';
  author: string;
  maxLimit: number;
  itemId?: string;
  customStyle: React.CSSProperties;
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

export interface AudioNode extends BaseNode {
  type: 'audio';
  src: string;
  volume: number;
  start: number;
}

export interface RowNode extends BaseNode {
  type: 'row';
  style: React.CSSProperties;
  children: ASTNode[];
}

export type ASTNode = 
  | TextNode 
  | QuoteNode 
  | ImageNode 
  | GalleryNode 
  | StyleNode 
  | AudioNode 
  | RowNode;
