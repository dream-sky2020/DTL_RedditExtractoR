import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button, Space, Typography, Alert } from 'antd';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { StateField, RangeSetBuilder } from '@codemirror/state';
import { dsl } from './DslLanguage';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

// [split] 高亮装饰器
const splitDecoration = Decoration.mark({
  attributes: { 
    style: 'background-color: #722ed1; color: #fff; padding: 0 4px; border-radius: 2px; font-weight: bold; box-shadow: 0 0 4px #9254de;' 
  }
});

const splitHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    const doc = tr.state.doc.toString();
    const builder = new RangeSetBuilder<Decoration>();
    const regex = /\[split\]/g;
    let match;
    while ((match = regex.exec(doc)) !== null) {
      builder.add(match.index, match.index + match[0].length, splitDecoration);
    }
    return builder.finish();
  },
  provide: f => EditorView.decorations.from(f)
});

interface DslSplitContentProps {
  initialValue: string;
  onChange: (value: string) => void;
}

export const DslSplitContent: React.FC<DslSplitContentProps> = ({
  initialValue,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    onChange(localValue);
  }, [localValue, onChange]);

  const insertSplit = () => {
    const view = editorRef.current?.view;
    if (!view) return;
    const selection = view.state.selection.main;
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: '[split]' },
      selection: { anchor: selection.from + '[split]'.length }
    });
    view.focus();
  };

  const extensions = useMemo(() => [
    dsl(),
    splitHighlightField,
    EditorView.lineWrapping,
    EditorView.theme({
      "&": { height: "350px", fontSize: "14px" },
      ".cm-content": { fontFamily: "'Fira Code', 'Courier New', monospace" },
      "&.cm-focused": { outline: "none" }
    })
  ], []);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        message="裁剪操作指南"
        description={
          <div style={{ fontSize: '12px' }}>
            <p>1. 在下方编辑器中插入 <strong>[split]</strong> 标记进行裁剪。</p>
            <p>2. 新生成的画面格将自动分配唯一 ID 并紧跟在原画面格之后。</p>
          </div>
        }
        type="info"
        showIcon
      />
      <div style={{ marginBottom: 8 }}>
        <Button icon={<PlusOutlined />} onClick={insertSplit} size="small">
          在光标处插入 [split]
        </Button>
      </div>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
        <CodeMirror
          ref={editorRef}
          value={localValue}
          height="350px"
          extensions={extensions}
          onChange={(val) => setLocalValue(val)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
          }}
        />
      </div>
    </Space>
  );
};
