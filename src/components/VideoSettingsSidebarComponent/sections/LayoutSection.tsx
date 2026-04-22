import React from 'react';
import { Row, Col, Form, Select, Typography } from 'antd';
import { ImageLayoutMode, SceneLayoutType, TitleAlignmentType } from '../../../types';

const { Text } = Typography;

interface LayoutSectionProps {
  idPrefix: string;
  imageLayoutMode: ImageLayoutMode;
  setImageLayoutMode: (mode: ImageLayoutMode) => void;
  sceneLayout: SceneLayoutType;
  setSceneLayout: (layout: SceneLayoutType) => void;
  titleAlignment: TitleAlignmentType;
  setTitleAlignment: (alignment: TitleAlignmentType) => void;
}

export const LayoutSection: React.FC<LayoutSectionProps> = ({
  idPrefix,
  imageLayoutMode,
  setImageLayoutMode,
  sceneLayout,
  setSceneLayout,
  titleAlignment,
  setTitleAlignment,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item id={getId('title-alignment-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>标题对齐方式</Text>}>
            <Select<TitleAlignmentType>
              id={getId('title-alignment-select')}
              value={titleAlignment}
              onChange={setTitleAlignment}
              style={{ width: '100%' }}
              styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
              className="custom-blue-select"
              options={[
                { label: '居中对齐', value: 'center' },
                { label: '靠左对齐', value: 'left' },
                { label: '靠右对齐', value: 'right' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item id={getId('image-layout-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>多图排列模式</Text>}>
            <Select<ImageLayoutMode>
              id={getId('image-layout-select')}
              value={imageLayoutMode}
              onChange={setImageLayoutMode}
              style={{ width: '100%' }}
              styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
              className="custom-blue-select"
              options={[
                { label: '多图轮播', value: 'gallery' },
                { label: '并列排列 (Row)', value: 'row' },
                { label: '单图竖排 (Single)', value: 'single' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item id={getId('scene-layout-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>脚本场景布局</Text>}>
            <Select<SceneLayoutType>
              id={getId('scene-layout-select')}
              value={sceneLayout}
              onChange={setSceneLayout}
              style={{ width: '100%' }}
              styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
              className="custom-blue-select"
              options={[
                { label: '居中布局 (Center)', value: 'center' },
                { label: '顶部布局 (Top)', value: 'top' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};
