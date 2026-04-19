import React, { useRef } from 'react';
import { Input, Button, Space, Card, Tooltip, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  FontSizeOutlined,
  FontColorsOutlined,
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  PauseCircleOutlined,
  FormatPainterOutlined,
  FileImageOutlined,
  AppstoreOutlined,
  SoundOutlined,
  MessageOutlined,
  LayoutOutlined,
  EnterOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

interface DslEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

/**
 * DslEditor 组件
 * 功能：为项目自定义的 [style] 语法提供便捷的编辑体验。
 * 包含：
 * 1. 快捷工具栏：快速插入加粗、字号、对齐等标签。
 * 2. 文本区域：支持光标定位插入。
 * 3. 实时同步：通过 onChange 回传最新的文本内容。
 */
export const DslEditor: React.FC<DslEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容或使用上方工具栏插入标签...',
  rows = 8,
}) => {
  const textAreaRef = useRef<any>(null);

  // 在光标位置插入文本的通用方法
  const insertText = (before: string, after: string = '') => {
    const textarea = textAreaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = 
      value.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      value.substring(end);

    onChange(newValue);

    // 重新聚焦并设置光标位置 (异步处理以确保 DOM 已更新)
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <Card 
      size="small"
      className="dsl-editor-card"
      title={
        <Space split={<Divider type="vertical" />} wrap>
          <Space size={2}>
            <Tooltip title="加粗 [style b]">
              <Button size="small" icon={<BoldOutlined />} onClick={() => insertText('[style b]', '[/style]')} />
            </Tooltip>
            <Tooltip title="斜体 [style i]">
              <Button size="small" icon={<ItalicOutlined />} onClick={() => insertText('[style i]', '[/style]')} />
            </Tooltip>
            <Tooltip title="下划线 [style u]">
              <Button size="small" icon={<UnderlineOutlined />} onClick={() => insertText('[style u]', '[/style]')} />
            </Tooltip>
          </Space>
          
          <Space size={2}>
            <Tooltip title="字号 [style size=32]">
              <Button size="small" icon={<FontSizeOutlined />} onClick={() => insertText('[style size=32]', '[/style]')} />
            </Tooltip>
            <Tooltip title="颜色 [style color=#ff4d4f]">
              <Button size="small" icon={<FontColorsOutlined />} onClick={() => insertText('[style color=#ff4d4f]', '[/style]')} />
            </Tooltip>
          </Space>

          <Space size={2}>
            <Tooltip title="左对齐 [style align=left]">
              <Button size="small" icon={<AlignLeftOutlined />} onClick={() => insertText('[style align=left]', '[/style]')} />
            </Tooltip>
            <Tooltip title="居中 [style align=center]">
              <Button size="small" icon={<AlignCenterOutlined />} onClick={() => insertText('[style align=center]', '[/style]')} />
            </Tooltip>
            <Tooltip title="右对齐 [style align=right]">
              <Button size="small" icon={<AlignRightOutlined />} onClick={() => insertText('[style align=right]', '[/style]')} />
            </Tooltip>
          </Space>

          <Space size={2}>
            <Tooltip title="图片 [image]url[/image]">
              <Button size="small" icon={<FileImageOutlined />} onClick={() => insertText('[image]', '[/image]')} />
            </Tooltip>
            <Tooltip title="图集 [gallery]url1|2.5,url2|2.5[/gallery]">
              <Button size="small" icon={<AppstoreOutlined />} onClick={() => insertText('[gallery]', '[/gallery]')} />
            </Tooltip>
            <Tooltip title="音频 [audio src=...]">
              <Button size="small" icon={<SoundOutlined />} onClick={() => insertText('[audio src="', '"]')} />
            </Tooltip>
          </Space>

          <Space size={2}>
            <Tooltip title="引用 [quote author=...]">
              <Button size="small" icon={<MessageOutlined />} onClick={() => insertText('[quote author="Alice"]', '[/quote]')} />
            </Tooltip>
            <Tooltip title="行布局 [row gap=8]">
              <Button size="small" icon={<LayoutOutlined />} onClick={() => insertText('[row gap=8]', '[/row]')} />
            </Tooltip>
          </Space>

          <Space size={2}>
            <Tooltip title="强制换行 [\n]">
              <Button size="small" icon={<EnterOutlined />} onClick={() => insertText('[\\n]')} />
            </Tooltip>
            <Tooltip title="插入停顿 [pause 0.5]">
              <Button size="small" icon={<PauseCircleOutlined />} onClick={() => insertText('[pause 0.5]')} />
            </Tooltip>
            <Tooltip title="重置样式 [/style]">
              <Button size="small" icon={<FormatPainterOutlined />} onClick={() => insertText('[/style]')} />
            </Tooltip>
          </Space>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <TextArea
        ref={textAreaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        bordered={false}
        style={{ 
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: '14px',
          padding: '12px',
          resize: 'vertical',
          backgroundColor: '#fafafa'
        }}
      />
    </Card>
  );
};
