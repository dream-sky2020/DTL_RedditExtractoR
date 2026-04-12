import os
import re

def remove_duplicate_audio(directory):
    if not os.path.exists(directory):
        print(f"Directory {directory} does not exist.")
        return

    # 正则表达式匹配 "文件名 (数字).扩展名" 的模式
    # \s\(\d+\) 匹配 " (1)", " (2)" 等
    pattern = re.compile(r'^(.*)\s\(\d+\)(\.[^.]+)$')
    
    files = os.listdir(directory)
    removed_count = 0

    for filename in files:
        match = pattern.match(filename)
        if match:
            base_name = match.group(1)
            extension = match.group(2)
            original_filename = base_name + extension
            
            # 检查本体文件是否存在
            original_path = os.path.join(directory, original_filename)
            duplicate_path = os.path.join(directory, filename)
            
            if os.path.exists(original_path):
                try:
                    os.remove(duplicate_path)
                    print(f"已删除重复音效: {filename} (由于 {original_filename} 已存在)")
                    removed_count += 1
                except Exception as e:
                    print(f"删除 {filename} 时出错: {e}")
            else:
                print(f"跳过 {filename}: 未找到对应的本体文件 {original_filename}")

    print(f"\n处理完成。共删除 {removed_count} 个重复文件。")

if __name__ == "__main__":
    target_dir = os.path.join("public", "audio", "shortAudio", "Unassigned")
    remove_duplicate_audio(target_dir)
