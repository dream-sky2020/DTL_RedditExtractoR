import React from 'react';
import { Row, Col, Select, InputNumber, Button, Table, Space, Typography, Input } from 'antd';
import { AuthorProfile, CommentSortMode, ReplyOrderMode } from '../../../utils/redditTransformer';

const { Text } = Typography;

type ColorArrangementMode = 'uniform' | 'randomized';
interface ColorArrangementSettings {
  mode: ColorArrangementMode;
  hueOffset: number;
  hueStep: number;
  saturation: number;
  lightness: number;
  seed: number;
}

interface AuthorIdentityRow {
  author: string;
  alias: string;
  color: string;
}

interface PrivacyConfigPanelProps {
  editorColorArrangement: ColorArrangementSettings;
  setEditorColorArrangement: React.Dispatch<React.SetStateAction<ColorArrangementSettings>>;
  onRearrangeColorsAndApply: (sortMode: CommentSortMode, replyOrder: ReplyOrderMode, settings: ColorArrangementSettings) => void;
  editorSortMode: CommentSortMode;
  editorReplyOrderMode: ReplyOrderMode;
  allAuthors: string[];
  authorProfiles: Record<string, AuthorProfile>;
  onUpdateAuthorProfile: (author: string, updates: Partial<AuthorProfile>) => void;
}

export const PrivacyConfigPanel: React.FC<PrivacyConfigPanelProps> = ({
  editorColorArrangement,
  setEditorColorArrangement,
  onRearrangeColorsAndApply,
  editorSortMode,
  editorReplyOrderMode,
  allAuthors,
  authorProfiles,
  onUpdateAuthorProfile,
}) => {
  return (
    <div id="editor-page-privacy-config-panel" style={{ 
      padding: 12, 
      borderRadius: 8, 
      background: 'var(--panel-bg-darker)', 
      border: '1px solid var(--brand-border)' 
    }}>
      <Typography.Paragraph id="editor-page-privacy-desc" style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        扫描到的所有发言用户会显示在这里。你可以为每个用户设置代号和颜色。
      </Typography.Paragraph>
      
      <div id="editor-page-color-rule-config" style={{ marginBottom: 16 }}>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 12, display: 'block', marginBottom: 8 }}>颜色生成规则</Text>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Select<ColorArrangementMode>
              id="editor-page-color-mode-select"
              size="small"
              value={editorColorArrangement.mode}
              onChange={(mode) => setEditorColorArrangement((prev) => ({ ...prev, mode }))}
              styles={{ popup: { root: { background: 'var(--brand-border)' } } }}
              className="custom-blue-select"
              options={[
                { label: '均匀分布', value: 'uniform' },
                { label: '随机打散', value: 'randomized' },
              ]}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <InputNumber
              id="editor-page-hue-offset-input"
              name="hue-offset-input"
              size="small"
              min={0}
              max={359}
              value={editorColorArrangement.hueOffset}
              onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueOffset: Number(value ?? 0) }))}
              placeholder="色相"
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            />
          </Col>
          <Col span={6}>
            <InputNumber
              id="editor-page-hue-step-input"
              name="hue-step-input"
              size="small"
              min={1}
              max={359}
              value={editorColorArrangement.hueStep}
              onChange={(value) => setEditorColorArrangement((prev) => ({ ...prev, hueStep: Number(value ?? 1) }))}
              placeholder="步进"
              style={{ width: '100%', color: 'var(--text-primary)', background: 'var(--input-bg)' }}
            />
          </Col>
        </Row>
        <Button 
          id="editor-page-rearrange-colors-btn"
          name="rearrange-colors-btn"
          size="small" 
          block 
          style={{ marginTop: 8, color: 'var(--text-light-blue)', borderColor: 'var(--btn-primary-border)', background: 'transparent' }}
          onClick={() => onRearrangeColorsAndApply(editorSortMode, editorReplyOrderMode, editorColorArrangement)}
        >
          重排颜色
        </Button>
      </div>

      <Table<AuthorIdentityRow>
        id="editor-page-author-table"
        rowKey={(record) => record.author}
        size="small"
        pagination={{ pageSize: 10, size: 'small' }}
        dataSource={allAuthors.map((author) => ({
          author,
          alias: authorProfiles[author]?.alias || '',
          color: authorProfiles[author]?.color || '#1890ff',
        }))}
        style={{ 
          background: 'var(--panel-bg-translucent)',
          marginTop: 12,
          padding: 8,
          borderRadius: 8,
          border: '1px solid var(--brand-border)'
        }}
        columns={[
          {
            title: <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>原用户名</Text>,
            dataIndex: 'author',
            key: 'author',
            render: (value: string) => <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>u/{value}</Text>,
          },
          {
            title: <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>代号/颜色</Text>,
            dataIndex: 'alias',
            key: 'alias',
            width: 150,
            render: (_: string, record: AuthorIdentityRow) => (
              <Space size={4}>
                          <Input
                            size="small"
                            value={record.alias}
                            placeholder="代号"
                            onChange={(e) => onUpdateAuthorProfile(record.author, { alias: e.target.value })}
                            style={{ width: 80, background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--brand-border)' }}
                          />
                <Input
                  size="small"
                  type="color"
                  value={record.color}
                  onChange={(e) => onUpdateAuthorProfile(record.author, { color: e.target.value })}
                  style={{ width: 32, padding: 0, border: 'none', height: 24 }}
                />
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};
