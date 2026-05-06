import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Space, Card, Tooltip, Divider, Badge } from 'antd';
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
  SearchOutlined,
  CodeOutlined,
  ControlOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { dialogs } from './Dialogs';
import { getMetadataForTag } from '../rendering/metadata';
import { parseInlineAttrs } from '../rendering/parser/utils';
import { parseAttrs } from '../rendering/sceneDsl';
import { dsl } from './DslLanguage';

interface DetectedTag {
  tagName: string;
  fullText: string;
  start: number;
  end: number;
  attrStr: string;
  content: string;
  syntax: 'angle' | 'square';
  headerLength: number;
  footerLength: number;
}

interface DslEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onOpenGlobalReplace?: (selectedText: string) => void;
  onPreviewLayout?: () => void;
}

// 定义高亮效果的 Effect
const setTagHighlight = StateEffect.define<{ start: number; headerLen: number; footerLen: number; end: number } | null>();

// 定义管理高亮样式的 Field
const tagHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(setTagHighlight)) {
        if (!e.value) return Decoration.none;
        const builder = new RangeSetBuilder<Decoration>();
        const { start, headerLen, footerLen, end } = e.value;
        
        // 开始标签背景
        builder.add(start, start + headerLen, Decoration.mark({
          attributes: { style: 'background-color: #f6ffed; border-radius: 2px;' }
        }));
        
        // 结束标签背景
        if (footerLen > 0) {
          builder.add(end - footerLen, end, Decoration.mark({
            attributes: { style: 'background-color: #f6ffed; border-radius: 2px;' }
          }));
        }
        return builder.finish();
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

export const DslEditor: React.FC<DslEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容...',
  rows = 8,
  onOpenGlobalReplace,
  onPreviewLayout,
}) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [detectedTag, setDetectedTag] = useState<DetectedTag | null>(null);

  // 寻找光标所在的标签 (保持逻辑一致)
  const findTagAtCursor = useCallback((text: string, cursorOffset: number): DetectedTag | null => {
    if (!text) return null;
    let openPos = -1;
    let syntax: 'angle' | 'square' | null = null;

    for (let i = cursorOffset; i >= 0; i--) {
      if (text[i] === '[' && (i === 0 || text[i-1] !== '\\')) {
        if (text[i+1] === '/') continue;
        openPos = i;
        syntax = 'square';
        break;
      }
      if (text[i] === '<' && (i === 0 || text[i-1] !== '\\')) {
        if (text[i+1] === '/') continue;
        openPos = i;
        syntax = 'angle';
        break;
      }
    }

    if (openPos === -1 || !syntax) return null;

    const remaining = text.substring(openPos);
    let match: RegExpMatchArray | null = null;
    if (syntax === 'square') {
      match = remaining.match(/^\[([a-zA-Z0-9]+)([^\]]*)\]/);
    } else {
      match = remaining.match(/^<([a-zA-Z0-9]+)([^>]*?)(\/?>)/);
    }

    if (!match) return null;
    const tagName = match[1];
    const attrStr = match[2];
    const fullTagHeader = match[0];

    let endPos = -1;
    let content = '';
    let footerLength = 0;
    const startTagEnd = openPos + fullTagHeader.length;

    if (syntax === 'square') {
      const metadata = getMetadataForTag(tagName);
      if (metadata && !metadata.hasContent) {
        endPos = startTagEnd;
      } else {
        const closeTag = `[/${tagName}]`;
        const closeIdx = text.indexOf(closeTag, startTagEnd);
        if (closeIdx !== -1) {
          endPos = closeIdx + closeTag.length;
          content = text.substring(startTagEnd, closeIdx);
          footerLength = closeTag.length;
        } else {
          endPos = startTagEnd;
        }
      }
    } else {
      if (fullTagHeader.endsWith('/>')) {
        endPos = startTagEnd;
      } else {
        const closeTag = `</${tagName}>`;
        const closeIdx = text.indexOf(closeTag, startTagEnd);
        if (closeIdx !== -1) {
          endPos = closeIdx + closeTag.length;
          content = text.substring(startTagEnd, closeIdx);
          footerLength = closeTag.length;
        } else {
          endPos = startTagEnd;
        }
      }
    }

    if (cursorOffset >= openPos && cursorOffset <= endPos) {
      return {
        tagName,
        fullText: text.substring(openPos, endPos),
        start: openPos,
        end: endPos,
        attrStr,
        content,
        syntax,
        headerLength: fullTagHeader.length,
        footerLength
      };
    }
    return null;
  }, []);

  // 更新检测到的标签并应用高亮
  const lastHighlightedRange = useRef<string>("");

  const handleUpdate = useCallback((viewUpdate: any) => {
    const state = viewUpdate.state;
    const pos = state.selection.main.head;
    const doc = state.doc.toString();
    const tag = findTagAtCursor(doc, pos);
    
    setDetectedTag((prev) => {
      if (!prev && !tag) return prev;
      if (
        prev &&
        tag &&
        prev.tagName === tag.tagName &&
        prev.start === tag.start &&
        prev.end === tag.end &&
        prev.headerLength === tag.headerLength &&
        prev.footerLength === tag.footerLength
      ) {
        return prev;
      }
      return tag;
    });

    // 只有当高亮范围发生变化时才发送 Effect，避免频繁重绘
    const rangeKey = tag ? `${tag.start}-${tag.end}` : "none";
    if (rangeKey !== lastHighlightedRange.current) {
      lastHighlightedRange.current = rangeKey;
      viewUpdate.view.dispatch({
        effects: setTagHighlight.of(tag ? {
          start: tag.start,
          headerLen: tag.headerLength,
          footerLen: tag.footerLength,
          end: tag.end
        } : null)
      });
    }
  }, [findTagAtCursor]);

  const insertText = (before: string, after: string = '') => {
    const view = editorRef.current?.view;
    if (!view) return;

    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: before + selectedText + after
      },
      selection: { anchor: selection.from + before.length + selectedText.length + after.length }
    });
    view.focus();
  };

  const handleOpenGlobalReplace = () => {
    const view = editorRef.current?.view;
    if (!view) return;
    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    onOpenGlobalReplace?.(selectedText);
  };

  const handleOpenPropertyHelper = (forcedTagName?: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    let tagName = forcedTagName || '';
    let initialValues: Record<string, any> = {};
    let initialContent = '';

    if (!tagName && detectedTag) {
      tagName = detectedTag.tagName;
      initialContent = detectedTag.content;
      initialValues = detectedTag.syntax === 'square' 
        ? parseInlineAttrs(detectedTag.attrStr) 
        : parseAttrs(detectedTag.attrStr);
    }

    if (!tagName) {
      const selection = view.state.selection.main;
      const selectedText = view.state.doc.sliceString(selection.from, selection.to).trim();
      
      const squareMatch = selectedText.match(/^\[([a-zA-Z0-9]+)([^\]]*)\]([\s\S]*?)(?:\[\/\1\])?$/);
      if (squareMatch) {
        tagName = squareMatch[1];
        initialContent = squareMatch[3];
        initialValues = parseInlineAttrs(squareMatch[2]);
      } else {
        const angleMatch = selectedText.match(/^<([a-zA-Z0-9]+)([^>]*?)(?:\/?>|>(?:[\s\S]*?)<\/\1>)$/);
        if (angleMatch) {
          tagName = angleMatch[1];
          initialValues = parseAttrs(angleMatch[2]);
          const contentMatch = selectedText.match(/^<[a-zA-Z0-9]+[^>]*>([\s\S]*?)<\/[a-zA-Z0-9]+>$/);
          if (contentMatch) initialContent = contentMatch[1];
        }
      }
      if (!tagName && selectedText.startsWith('http')) {
        tagName = 'image';
        initialContent = selectedText;
      }
    }

    // 3. 默认值处理：如果没有识别到标签，不再默认 image，而是让助手显示选择界面
    const standardValues: Record<string, any> = {};
    if (tagName) {
      const meta = getMetadataForTag(tagName);
      if (meta) {
        meta.properties.forEach(prop => {
          const aliasName = prop.alias?.find(a => initialValues[a] !== undefined);
          const val = initialValues[prop.name] ?? (aliasName ? initialValues[aliasName] : undefined);
          if (val !== undefined) {
            if (prop.type === 'number') standardValues[prop.name] = Number(val);
            else if (prop.type === 'boolean') standardValues[prop.name] = val === 'true' || val === '';
            else standardValues[prop.name] = val;
          }
        });
      }
    }

    dialogs.showPropertyHelper({
      tagName: tagName || undefined,
      initialValues: standardValues,
      initialContent,
      onInsert: (dsl) => {
        if (!dsl) return; // 如果没有生成内容（比如未选择标签），则不操作
        // 如果是在识别到的标签上操作，替换整个标签
        if (detectedTag && !forcedTagName) {
          view.dispatch({
            changes: { from: detectedTag.start, to: detectedTag.end, insert: dsl }
          });
        } else {
          insertText(dsl);
        }
      }
    });
  };

  const extensions = useMemo(() => [
    dsl(),
    tagHighlightField,
    EditorView.lineWrapping,
    EditorView.theme({
      "&": { height: `${rows * 1.5}em`, fontSize: "14px" },
      ".cm-content": { fontFamily: "'Fira Code', 'Courier New', monospace" },
      ".cm-gutters": { display: "none" },
      "&.cm-focused": { outline: "none" }
    })
  ], [rows]);

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
            <Tooltip title="快速插入图片 [image]url[/image]">
              <Button size="small" icon={<FileImageOutlined />} onClick={() => insertText('[image]', '[/image]')} />
            </Tooltip>
            <Tooltip title="属性助手 (智能识别标签/可视化配置)">
              <Button 
                size="small" 
                icon={<ControlOutlined />} 
                onClick={() => handleOpenPropertyHelper()}
                style={{ 
                  color: detectedTag ? '#52c41a' : '#1890ff', 
                  borderColor: detectedTag ? '#b7eb8f' : '#91d5ff',
                  backgroundColor: detectedTag ? '#f6ffed' : 'transparent'
                }}
              />
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
            <Tooltip title="场景配置 <scene ...>">
              <Button size="small" icon={<SettingOutlined />} onClick={() => handleOpenPropertyHelper('scene')} />
            </Tooltip>
            <Tooltip title="项目配置 <item ...>">
              <Button size="small" icon={<ControlOutlined />} onClick={() => handleOpenPropertyHelper('item')} />
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
            <Tooltip title="全局替换（先选中文本更方便）">
              <Button size="small" icon={<SearchOutlined />} onClick={handleOpenGlobalReplace} />
            </Tooltip>
            <Tooltip title="布局预览 (Debug)">
              <Button 
                size="small" 
                icon={<CodeOutlined />} 
                onClick={onPreviewLayout}
                style={{ color: '#722ed1', borderColor: '#d3adf7' }}
              />
            </Tooltip>
          </Space>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ backgroundColor: '#fafafa', border: '1px solid #d9d9d9' }}>
        <CodeMirror
          ref={editorRef}
          value={value}
          height="auto"
          placeholder={placeholder}
          extensions={extensions}
          onChange={(val) => onChange(val)}
          onUpdate={handleUpdate}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
          }}
        />
      </div>
    </Card>
  );
};
