import React from 'react';
import { Card } from 'antd';
import { BugOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { SceneCard } from '../../../components/SceneCard';
import { VideoScene } from '../../../types';

interface EditorSectionProps {
  scene: VideoScene;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateScene: (updates: Partial<VideoScene>) => void;
  onPreviewScene: () => void;
  onReplaceScene: (next: VideoScene) => { ok: boolean; message?: string };
}

export const EditorSection: React.FC<EditorSectionProps> = ({
  scene,
  isExpanded,
  onToggleExpand,
  onUpdateScene,
  onPreviewScene,
  onReplaceScene,
}) => {
  return (
    <Card
      title={<span><BugOutlined /> 画面编辑卡片</span>}
      variant="outlined"
      style={{ borderRadius: 12 }}
    >
      <DragDropContext onDragEnd={() => { }}>
        <Droppable droppableId="test-list" type="scene">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <SceneCard
                scene={scene}
                index={0}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onUpdateScene={onUpdateScene}
                onRemoveScene={() => alert('触发删除画面格回调')}
                onPreviewScene={onPreviewScene}
                onReplaceScene={onReplaceScene}
                previewDisabled={false}
              />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Card>
  );
};
