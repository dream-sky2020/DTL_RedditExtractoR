export interface SceneInfo {
  attributes: string;
  content: string;
}

export interface ItemInfo {
  attributes: string;
  content: string;
}

export interface AuthorInfo {
  fullBlock: string;
  remainingContent: string;
}

export interface TitleInfo {
  fullBlock: string;
  remainingContent: string;
}

export interface SplitResult {
  segments: string[];
}
