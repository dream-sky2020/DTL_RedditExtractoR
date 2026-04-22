import React from 'react';
import { Row, Col, Form, Input, Typography } from 'antd';
import { VideoConfig } from '../../../types';

const { Text } = Typography;

interface BasicMetaSectionProps {
  idPrefix: string;
  draftConfig: VideoConfig;
  setDraftConfig: (config: VideoConfig) => void;
}

export const BasicMetaSection: React.FC<BasicMetaSectionProps> = ({
  idPrefix,
  draftConfig,
  setDraftConfig,
}) => {
  const getId = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item id={getId('video-title-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>视频标题</Text>}>
          <Input
            id={getId('video-title-input')}
            name="video-title-input"
            value={draftConfig.title}
            onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
            style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item id={getId('subreddit-item')} label={<Text style={{ color: 'var(--text-secondary)' }}>Subreddit (r/)</Text>}>
          <Input
            id={getId('subreddit-input')}
            name="subreddit-input"
            value={draftConfig.subreddit}
            onChange={(e) => setDraftConfig({ ...draftConfig, subreddit: e.target.value })}
            style={{ color: 'var(--text-primary)', background: 'var(--input-bg)' }}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};
