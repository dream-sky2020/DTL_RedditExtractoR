import { useState, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';
import { 
  transformRedditJson, 
  extractAuthorsFromRawData 
} from '../utils/redditTransformer';
import { 
  AuthorProfile, 
  CommentSortMode, 
  ReplyOrderMode, 
  ColorArrangementSettings 
} from '../types';
import { 
  RAW_REDDIT_DATA_STORAGE_KEY, 
  AUTHOR_PROFILES_STORAGE_KEY 
} from '../constants/storage';
import { hslToHex } from '../utils/color/hslToHex';
import { pseudoRandom01 } from '../utils/random/pseudoRandom01';

export const useRedditData = (
  commentSortMode: CommentSortMode,
  replyOrderMode: ReplyOrderMode,
  colorArrangement: ColorArrangementSettings
) => {
  const [redditUrl, setRedditUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rawResult, setRawResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [errorDebug, setErrorDebug] = useState('');
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, AuthorProfile>>({});
  const [hasStoredRawData, setHasStoredRawData] = useState(false);

  const buildColorWithSettings = (index: number, settings: ColorArrangementSettings) => {
    const s = Math.max(20, Math.min(90, settings.saturation)) / 100;
    const l = Math.max(20, Math.min(80, settings.lightness)) / 100;
    const offset = ((settings.hueOffset % 360) + 360) % 360;
    const step = Math.max(1, Math.min(359, settings.hueStep));
    const hue = settings.mode === 'uniform'
      ? (offset + index * step) % 360
      : (offset + pseudoRandom01(settings.seed, index) * 360) % 360;
    return hslToHex(hue, s, l);
  };

  const buildProfilesForAuthors = (
    authors: string[],
    previousProfiles: Record<string, AuthorProfile>,
    settings: ColorArrangementSettings,
    overwriteColors = false,
  ) => {
    const nextProfiles: Record<string, AuthorProfile> = { ...previousProfiles };

    authors.forEach((author, index) => {
      const existing = nextProfiles[author] || {};
      if (overwriteColors || !existing.color) {
        nextProfiles[author] = {
          ...existing,
          color: buildColorWithSettings(index, settings),
        };
      }
    });

    return nextProfiles;
  };

  const fetchRedditData = async () => {
    if (!redditUrl.trim()) return;

    setLoading(true);
    setError('');
    setErrorDebug('');
    setResult(null);
    setRawResult(null);

    try {
      const jsonUrl = `${redditUrl.trim().replace(/\/$/, '')}.json`;
      const proxyUrl = `http://localhost:5000/fetch_reddit?url=${encodeURIComponent(jsonUrl)}`;
      const response = await axios.get(proxyUrl);
      
      const nextAuthors = extractAuthorsFromRawData(response.data);
      const nextProfiles = buildProfilesForAuthors(nextAuthors, authorProfiles, colorArrangement);
      
      setAllAuthors(nextAuthors);
      setAuthorProfiles(nextProfiles);
      setRawResult(response.data);
      setHasStoredRawData(true);
      
      const nextResult = transformRedditJson(response.data, {
        sortMode: commentSortMode,
        replyOrder: replyOrderMode,
        authorProfiles: nextProfiles,
      });
      setResult(nextResult);

      // 持久化
      localStorage.setItem(AUTHOR_PROFILES_STORAGE_KEY, JSON.stringify(nextProfiles));
      localStorage.setItem(RAW_REDDIT_DATA_STORAGE_KEY, JSON.stringify(response.data));
      
      message.success('数据提取成功');
    } catch (err) {
      console.error(err);
      setError('抓取失败，请检查 URL 是否正确或 Python 后端是否运行。');
      if (axios.isAxiosError(err)) {
        setErrorDebug(JSON.stringify(err.response?.data || err.message, null, 2));
      } else {
        setErrorDebug(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearPersistedData = () => {
    localStorage.removeItem(RAW_REDDIT_DATA_STORAGE_KEY);
    localStorage.removeItem(AUTHOR_PROFILES_STORAGE_KEY);
    setHasStoredRawData(false);
    setResult(null);
    setRawResult(null);
    setAllAuthors([]);
    setAuthorProfiles({});
    message.success('已清除本地缓存的数据');
  };

  return {
    redditUrl, setRedditUrl,
    loading, result, setResult,
    rawResult, setRawResult, error, errorDebug,
    allAuthors, setAllAuthors, authorProfiles, setAuthorProfiles,
    hasStoredRawData, setHasStoredRawData,
    fetchRedditData, clearPersistedData,
    buildProfilesForAuthors
  };
};
