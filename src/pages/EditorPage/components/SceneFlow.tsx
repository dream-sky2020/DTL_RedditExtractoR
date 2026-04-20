import React from 'react';
import { Space, Typography, Pagination } from 'antd';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SceneCard } from '../../../components/SceneCard';
import { VideoConfig, VideoScene } from '../../../types';

interface SceneFlowProps {
  videoConfig: VideoConfig;
  pagedScenes: VideoScene[];
  currentPage: number;
  pageSize: number;
  totalScenes: number;
  expandedSceneIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onUpdateScene: (sceneId: string, updates: Partial<VideoScene>) => void;
  onRemoveScene: (id: string) => void;
  setPreviewSceneId: (id: string | null) => void;
  replaceScene: (sceneId: string, nextScene: VideoScene) => { ok: boolean; message?: string };
  onDragEnd: (result: DropResult) => void;
  onPageChange: (page: number, size: number) => void;
  isMultiSelectMode: boolean;
  selectedSceneIds: string[];
  onToggleSceneSelection: (id: string) => void;
}

export const SceneFlow: React.FC<SceneFlowProps> = ({
  videoConfig,
  pagedScenes,
  currentPage,
  pageSize,
  totalScenes,
  expandedSceneIds,
  onToggleExpand,
  onUpdateScene,
  onRemoveScene,
  setPreviewSceneId,
  replaceScene,
  onDragEnd,
  onPageChange,
  isMultiSelectMode,
  selectedSceneIds,
  onToggleSceneSelection,
}) => {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space align="center">
          <Typography.Title id="editor-page-title" level={4} style={{ marginBottom: 0 }}>视频画面格流</Typography.Title>
        </Space>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="scene-list" type="scene" isCombineEnabled direction="vertical">
          {(provided) => (
            <div 
              id="editor-page-scene-list" 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              style={{
                display: 'block',
              }}
            >
              {pagedScenes.map((scene, localIdx) => {
                const globalIdx = (currentPage - 1) * pageSize + localIdx;
                return (
                  <Draggable key={scene.id} draggableId={scene.id} index={globalIdx}>
                    {(draggableProvided, snapshot) => (
                      <SceneCard
                        videoConfig={videoConfig}
                        scene={scene}
                        index={globalIdx}
                        isExpanded={expandedSceneIds[scene.id]}
                        onToggleExpand={() => onToggleExpand(scene.id)}
                        onUpdateScene={(updates) => onUpdateScene(scene.id, updates)}
                        onRemoveScene={() => onRemoveScene(scene.id)}
                        onPreviewScene={() => setPreviewSceneId(scene.id)}
                        onReplaceScene={(nextScene) => replaceScene(scene.id, nextScene)}
                        innerRef={draggableProvided.innerRef}
                        draggableProps={draggableProvided.draggableProps}
                        dragHandleProps={draggableProvided.dragHandleProps}
                        isDragging={snapshot.isDragging}
                        isMultiSelectMode={isMultiSelectMode}
                        isSelected={selectedSceneIds.includes(scene.id)}
                        onToggleSelection={() => onToggleSceneSelection(scene.id)}
                      />
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div id="editor-page-pagination-wrapper" style={{ marginTop: 24, textAlign: 'center' }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={totalScenes}
          onChange={onPageChange}
          showSizeChanger
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>
    </div>
  );
};
