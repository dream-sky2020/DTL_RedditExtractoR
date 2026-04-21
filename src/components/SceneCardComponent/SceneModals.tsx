import React from 'react';
import { Modal, Button, Typography, message } from 'antd';
import { SceneDslWarning } from '@/rendering/sceneDsl';

const { Text } = Typography;

interface SceneModalsProps {
  sceneId: string;
  isFormatErrorOpen: boolean;
  formatErrorMessage: string;
  isDslWarningOpen: boolean;
  dslWarnings: SceneDslWarning[];
  isUnsavedConfirmOpen: boolean;
  onFormatErrorCancel: () => void;
  onFormatErrorRollback: () => void;
  onDslWarningCancel: () => void;
  onDslWarningIgnore: () => void;
  onUnsavedCancel: () => void;
  onUnsavedDiscard: () => void;
  onUnsavedSave: () => void;
}

export const SceneModals: React.FC<SceneModalsProps> = ({
  sceneId,
  isFormatErrorOpen,
  formatErrorMessage,
  isDslWarningOpen,
  dslWarnings,
  isUnsavedConfirmOpen,
  onFormatErrorCancel,
  onFormatErrorRollback,
  onDslWarningCancel,
  onDslWarningIgnore,
  onUnsavedCancel,
  onUnsavedDiscard,
  onUnsavedSave,
}) => {
  return (
    <>
      <Modal
        title="场景格式错误"
        open={isFormatErrorOpen}
        onCancel={onFormatErrorCancel}
        destroyOnHidden
        footer={[
          <Button id={`scene-card-format-error-continue-btn-${sceneId}`} key="continue" onClick={onFormatErrorCancel}>
            继续修改
          </Button>,
          <Button
            id={`scene-card-format-error-rollback-btn-${sceneId}`}
            key="rollback"
            danger
            onClick={onFormatErrorRollback}
          >
            回退数据
          </Button>,
        ]}
      >
        <div id={`scene-card-format-error-modal-content-${sceneId}`}>
          <Typography.Paragraph id={`scene-card-format-error-msg-${sceneId}`} style={{ marginBottom: 0 }}>
            {formatErrorMessage}
          </Typography.Paragraph>
        </div>
      </Modal>

      <Modal
        title="场景脚本存在警告"
        open={isDslWarningOpen}
        onCancel={onDslWarningCancel}
        destroyOnHidden
        footer={[
          <Button
            id={`scene-card-dsl-warning-back-btn-${sceneId}`}
            key="back-edit"
            onClick={onDslWarningCancel}
          >
            返回修改
          </Button>,
          <Button
            id={`scene-card-dsl-warning-ignore-btn-${sceneId}`}
            key="ignore-warning"
            type="primary"
            onClick={onDslWarningIgnore}
          >
            忽略警告并应用
          </Button>,
        ]}
      >
        <div id={`scene-card-dsl-warning-modal-content-${sceneId}`}>
          <Typography.Paragraph id={`scene-card-dsl-warning-desc-${sceneId}`}>
            检测到以下警告，已给出修复建议。你可以返回修改，或忽略警告继续应用：
          </Typography.Paragraph>
          {dslWarnings.map((warning, idx) => (
            <Typography.Paragraph id={`scene-card-dsl-warning-item-${sceneId}-${idx}`} key={`dsl-warning-${idx}`} style={{ marginBottom: 8 }}>
              {idx + 1}. {warning.message}
              <br />
              <Text type="secondary">建议：{warning.suggestion}</Text>
            </Typography.Paragraph>
          ))}
        </div>
      </Modal>

      <Modal
        title="场景脚本有未保存修改"
        open={isUnsavedConfirmOpen}
        onCancel={onUnsavedCancel}
        destroyOnHidden
        footer={[
          <Button id={`scene-card-unsaved-continue-btn-${sceneId}`} key="continue-editing" onClick={onUnsavedCancel}>
            继续编辑
          </Button>,
          <Button
            id={`scene-card-unsaved-discard-btn-${sceneId}`}
            key="discard-and-close"
            danger
            onClick={onUnsavedDiscard}
          >
            不保存并退出
          </Button>,
          <Button
            id={`scene-card-unsaved-save-btn-${sceneId}`}
            key="save-and-close"
            type="primary"
            onClick={onUnsavedSave}
          >
            保存并退出
          </Button>,
        ]}
      >
        <div id={`scene-card-unsaved-modal-content-${sceneId}`}>
          <Typography.Paragraph id={`scene-card-unsaved-msg-${sceneId}`} style={{ marginBottom: 0 }}>
            你修改了场景脚本但还未保存，是否先保存再退出？
          </Typography.Paragraph>
        </div>
      </Modal>
    </>
  );
};
