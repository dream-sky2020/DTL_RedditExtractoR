import json
import re
from urllib.parse import urlparse, urlunparse

def normalize_url(url):
    """
    标准化 URL 以便更好地合并。
    1. 移除首尾空格
    2. 统一小写域名
    3. 移除末尾斜杠
    4. 移除查询参数和片段标识符
    """
    if not url:
        return ""
    url = url.strip()
    try:
        parsed = urlparse(url)
        # 域名转小写，移除末尾斜杠，移除查询参数和片段
        netloc = parsed.netloc.lower()
        path = parsed.path.rstrip('/')
        return urlunparse((parsed.scheme, netloc, path, '', '', ''))
    except:
        return url.rstrip('/').strip()

def apply_filter(entry, rules):
    """
    检查单个条目是否符合规则。
    """
    if not isinstance(entry, dict):
        return False
    
    url = entry.get("url", "")
    title = entry.get("title", "")
    visit_count = entry.get("visitCount", 0)
    
    # 基础过滤
    if visit_count < rules.get("min_visit_count", 0):
        return False
        
    include = rules.get("include", {})
    exclude = rules.get("exclude", {})
    
    # 排除规则 (只要命中任何一个就排除)
    if any(s in url for s in exclude.get("url_contains", [])): return False
    if any(s in title for s in exclude.get("title_contains", [])): return False
    if any(re.search(p, url) for p in exclude.get("url_regex", [])): return False
    if any(re.search(p, title) for p in exclude.get("title_regex", [])): return False
    
    # 包含规则
    has_include_rules = any([
        include.get("url_contains"),
        include.get("title_contains"),
        include.get("url_regex"),
        include.get("title_regex")
    ])
    
    if not has_include_rules:
        return True
        
    if any(s in url for s in include.get("url_contains", [])): return True
    if any(s in title for s in include.get("title_contains", [])): return True
    if any(re.search(p, url) for p in include.get("url_regex", [])): return True
    if any(re.search(p, title) for p in include.get("title_regex", [])): return True
    
    return False

def generic_filter_history(history_data, rules=None):
    """
    通用历史记录过滤函数，支持按 URL 标准化后合并重复项。
    """
    if rules is None:
        rules = {}
        
    # 使用字典按标准化后的 URL 合并
    merged_map = {}
    
    for entry in history_data:
        if apply_filter(entry, rules):
            raw_url = entry.get("url")
            if not raw_url:
                continue
            
            # 标准化 URL 用于合并
            norm_url = normalize_url(raw_url)
                
            # 简单的标题清理
            title = entry.get("title", "") or raw_url
            for replace_rule in rules.get("replace", []):
                old = replace_rule.get("old")
                new = replace_rule.get("new", "")
                if old:
                    title = title.replace(old, new)
            
            visit_count = entry.get("visitCount", 0)
            # 优先使用 lastVisitTime，如果没有则使用 visitTime
            last_visit_time = entry.get("lastVisitTime") or entry.get("visitTime") or 0
            
            if norm_url in merged_map:
                # 已存在，累加访问次数，取最新的访问时间
                item = merged_map[norm_url]
                item["visitCount"] += visit_count
                item["lastVisitTime"] = max(item["lastVisitTime"], last_visit_time)
                # 保持标题为最长的一个（通常更完整）
                if len(title.strip()) > len(item["title"]):
                    item["title"] = title.strip()
            else:
                # 新项
                merged_map[norm_url] = {
                    "id": entry.get("id"),
                    "title": title.strip(),
                    "url": raw_url, # 保留一个原始 URL 用于跳转
                    "lastVisitTime": last_visit_time,
                    "visitCount": visit_count,
                    "isPost": "/comments/" in raw_url
                }
    
    filtered_results = list(merged_map.values())
            
    # 排序
    sort_by = rules.get("sort_by", "visitCount")
    reverse = rules.get("reverse", True)
    filtered_results.sort(key=lambda x: x.get(sort_by, 0) if x.get(sort_by) is not None else 0, reverse=reverse)
    
    return filtered_results

def filter_reddit_history(history_data, subreddit="limbuscompany"):
    rules = {
        "include": {
            "url_contains": [f"reddit.com/r/{subreddit}"]
        },
        "replace": [
            {"old": f" : r/{subreddit}", "new": ""},
            {"old": " - Reddit", "new": ""}
        ]
    }
    return generic_filter_history(history_data, rules)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
            test_rules = {
                "include": {"url_contains": ["reddit.com"]},
                "min_visit_count": 1
            }
            results = generic_filter_history(data, test_rules)
            print(json.dumps(results, ensure_ascii=False, indent=2))
