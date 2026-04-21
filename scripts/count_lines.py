import os

def count_lines(directory, extensions=('.ts', '.tsx', '.js', '.jsx')):
    file_stats = []
    total_lines = 0

    # 遍历目录
    for root, dirs, files in os.walk(directory):
        # 排除不需要统计的目录
        if any(exclude in root for exclude in ['node_modules', 'dist', 'out', '.git', '.vscode', '.cursor']):
            continue
            
        for file in files:
            if file.endswith(extensions):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
                        # 读取前几行检查是否有忽略标识
                        content = []
                        is_ignored = False
                        for _ in range(5): # 检查前 5 行
                            line = f.readline()
                            if not line:
                                break
                            # 转换为小写并检查常见忽略标识
                            lower_line = line.lower()
                            if '@ts-nocheck' in lower_line or 'eslint-disable' in lower_line:
                                is_ignored = True
                                break
                            content.append(line)
                        
                        if is_ignored:
                            continue

                        # 统计剩余行数并加上已经读取的行数
                        lines = len(content) + sum(1 for _ in f)
                        total_lines += lines
                        relative_path = os.path.relpath(file_path, directory)
                        file_stats.append({'path': relative_path, 'lines': lines})
                except Exception as e:
                    print(f"无法读取文件 {file_path}: {e}")

    # 按行数降序排序
    file_stats.sort(key=lambda x: x['lines'], reverse=True)

    print("-" * 60)
    print(f"{'文件路径':<45} | {'行数':>10}")
    print("-" * 60)
    
    # 列出行数最多的前 15 个文件
    for stat in file_stats[:15]:
        print(f"{stat['path']:<45} | {stat['lines']:>10}")
        
    print("-" * 60)
    print(f"总代码行数 ({', '.join(extensions)}): {total_lines}")
    print(f"统计文件总数: {len(file_stats)}")
    print("-" * 60)

if __name__ == "__main__":
    # 统计当前目录下的代码
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    count_lines(project_root)
