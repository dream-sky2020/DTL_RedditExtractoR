import React from 'react';
import { Card, Space, Button, Checkbox, Typography, Input } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface SceneDslEditorProps {
  sceneId: string;
  sceneEditorText: string;
  autoApplySceneDsl: boolean;
  onTextChange: (text: string) => void;
  onAutoApplyChange: (checked: boolean) => void;
  onReload: () => void;
  onRollback: () => void;
  onApply: () => void;
  onSave: () => void;
}

export const SceneDslEditor: React.FC<SceneDslEditorProps> = ({
  sceneId,
  sceneEditorText,
  autoApplySceneDsl,
  onTextChange,
  onAutoApplyChange,
  onReload,
  onRollback,
  onApply,
  onSave,
}) => {
  return (
    <Card
      id={`scene-card-dsl-editor-${sceneId}`}
      size="small"
      variant="outlined"
      style={{ marginBottom: 12, background: 'var(--scene-card-bg-collapsed)', border: '1px solid var(--scene-item-border)' }}
      title="场景脚本（DSL）"
      extra={
        <Space id={`scene-card-dsl-actions-${sceneId}`}>
          <Button
            id={`scene-card-dsl-reload-btn-${sceneId}`}
            name="dsl-reload-btn"
            size="small"
            onClick={onReload}
          >
            从当前场景重载
          </Button>
          <Button
            id={`scene-card-dsl-rollback-btn-${sceneId}`}
            name="dsl-rollback-btn"
            size="small"
            onClick={onRollback}
          >
            回退
          </Button>
          <Button id={`scene-card-dsl-apply-btn-${sceneId}`} name="dsl-apply-btn" size="small" onClick={onApply}>
            应用
          </Button>
          <Button id={`scene-card-dsl-save-btn-${sceneId}`} name="dsl-save-btn" size="small" type="primary" onClick={onSave}>
            保存
          </Button>
          <Checkbox
            id={`scene-card-dsl-auto-apply-checkbox-${sceneId}`}
            name="dsl-auto-apply-checkbox"
            checked={autoApplySceneDsl}
            onChange={(e) => onAutoApplyChange(e.target.checked)}
          >
            自动保存
          </Checkbox>
        </Space>
      }
    >
      <Text id={`scene-card-dsl-desc-${sceneId}`} type="secondary">
        直接编辑场景 DSL。可在 scene 上使用 layout="top|center" 控制内容格垂直布局；在 item 正文中写 [\n] 可强制换行。
      </Text>
      <TextArea
        id={`scene-card-dsl-textarea-${sceneId}`}
        name="dsl-textarea"
        value={sceneEditorText}
        onChange={(e) => onTextChange(e.target.value)}
        rows={14}
        style={{ marginTop: 8, fontFamily: 'monospace' }}
      />
    </Card>
  );
};
