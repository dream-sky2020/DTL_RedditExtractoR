import React, { useMemo, useRef } from 'react';
import {
  Card,
  Space,
  Button,
  Checkbox,
  Typography,
  ColorPicker,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { VideoConfig, VideoScene } from '@/types';
import { useScenePreviewMetrics } from '@hooks/useScenePreviewMetrics';
import { useSceneDsl } from '@hooks/useSceneDsl';
import { SceneDslEditor } from '@components/SceneCardComponent/SceneDslEditor';
import { ScenePreview } from '@components/SceneCardComponent/ScenePreview';
import { SceneModals } from '@components/SceneCardComponent/SceneModals';

const { Text } = Typography;

interface SceneCardProps {
  videoConfig: VideoConfig;
  scene: VideoScene;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateScene: (updates: Partial<VideoScene>) => void;
  onRemoveScene: () => void;
  onPreviewScene: () => void;
  onReplaceScene: (nextScene: VideoScene) => { ok: boolean; message?: string };
  // 以下是 dnd 相关
  draggableProps?: any;
  dragHandleProps?: any;
  innerRef?: (element: HTMLElement | null) => void;
  isDragging?: boolean;
  previewDisabled?: boolean;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  videoConfig,
  scene,
  index,
  isExpanded,
  onToggleExpand,
  onUpdateScene,
  onRemoveScene,
  onPreviewScene,
  onReplaceScene,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  previewDisabled = false,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);

  const dsl = useSceneDsl({ scene, onReplaceScene });
  const previewMetrics = useScenePreviewMetrics(scene, videoConfig, previewShellRef, previewContentRef);

  return (
    <div
      id={`scene-card-wrapper-${scene.id}`}
      ref={innerRef}
      {...draggableProps}
      style={{ ...draggableProps?.style, marginBottom: 20 }}
    >
      <Card
        id={`scene-card-${scene.id}`}
        size="small"
        className={`scene-card ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}`}
        variant="outlined"
        style={{ 
          borderLeft: scene.type === 'post' ? '6px solid var(--scene-post-border)' : '6px solid var(--scene-comment-border)',
          boxShadow: isDragging ? '0 12px 32px var(--scene-card-shadow-dragging)' : (isExpanded ? '0 8px 24px var(--scene-card-shadow-expanded)' : '0 2px 8px var(--scene-card-shadow)'),
          background: isSelected ? 'var(--brand-primary-light)' : (isExpanded ? 'var(--scene-card-bg)' : 'var(--scene-card-bg-collapsed)'),
          borderRadius: 12,
          cursor: isMultiSelectMode ? 'pointer' : 'default',
          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid transparent',
        }}
        onClick={() => {
          if (isMultiSelectMode && onToggleSelection) {
            onToggleSelection();
          }
        }}
        title={
          <Space>
            {isMultiSelectMode && (
              <Checkbox 
                checked={isSelected} 
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelection?.();
                }} 
              />
            )}
            <div id={`scene-card-drag-handle-${scene.id}`} {...dragHandleProps}>
              <HolderOutlined style={{ color: 'var(--scene-holder-icon)' }} />
            </div>
          </Space>
        }
        extra={
          <Space id={`scene-card-actions-${scene.id}`} size="middle">
            {!isMultiSelectMode && (
              <>
                <ColorPicker
                  size="small"
                  value={scene.backgroundColor || videoConfig.sceneBackgroundColor || '#ffffff'}
                  onChange={(color) => onUpdateScene({ backgroundColor: color.toHexString() })}
                  showText
                />
                <Button id={`scene-card-edit-btn-${scene.id}`} name="edit-dsl-btn" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); dsl.toggleSceneEditor(); }}>
                  {dsl.isSceneEditorVisible ? '收起场景脚本' : '编辑场景脚本'}
                </Button>
                <Button id={`scene-card-preview-btn-${scene.id}`} name="preview-scene-btn" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); onPreviewScene(); }} disabled={previewDisabled}>预览</Button>
                <Button id={`scene-card-delete-btn-${scene.id}`} name="delete-scene-btn" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onRemoveScene(); }} />
              </>
            )}
            {isMultiSelectMode && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isSelected ? '已选中' : '未选中'}
              </Text>
            )}
          </Space>
        }
      >
        {dsl.isSceneEditorVisible && (
          <SceneDslEditor
            sceneId={scene.id}
            sceneEditorText={dsl.sceneEditorText}
            autoApplySceneDsl={dsl.autoApplySceneDsl}
            onTextChange={(text) => {
              dsl.setSceneEditorText(text);
              if (dsl.autoApplySceneDsl) {
                dsl.tryApplySceneEditor(text, true);
              }
            }}
            onAutoApplyChange={dsl.setAutoApplySceneDsl}
            onReload={dsl.reloadDsl}
            onRollback={dsl.rollbackDsl}
            onApply={dsl.applySceneEditor}
            onSave={dsl.saveSceneEditor}
          />
        )}

        <ScenePreview
          scene={scene}
          videoConfig={videoConfig}
          previewShellRef={previewShellRef}
          previewContentRef={previewContentRef}
          previewMetrics={previewMetrics}
          isMultiSelectMode={isMultiSelectMode || false}
          onUpdateScene={onUpdateScene}
        />
      </Card>

      <SceneModals
        sceneId={scene.id}
        isFormatErrorOpen={dsl.isFormatErrorOpen}
        formatErrorMessage={dsl.formatErrorMessage}
        isDslWarningOpen={dsl.isDslWarningOpen}
        dslWarnings={dsl.dslWarnings}
        isUnsavedConfirmOpen={dsl.isUnsavedConfirmOpen}
        onFormatErrorCancel={() => dsl.setIsFormatErrorOpen(false)}
        onFormatErrorRollback={() => {
          dsl.rollbackDsl();
          dsl.setIsFormatErrorOpen(false);
        }}
        onDslWarningCancel={() => dsl.setIsDslWarningOpen(false)}
        onDslWarningIgnore={dsl.handleIgnoreWarning}
        onUnsavedCancel={() => dsl.setIsUnsavedConfirmOpen(false)}
        onUnsavedDiscard={dsl.handleDiscardChanges}
        onUnsavedSave={dsl.handleSaveAndExit}
      />
    </div>
  );
};
