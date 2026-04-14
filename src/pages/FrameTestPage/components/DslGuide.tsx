import React from 'react';
import { Alert, Typography, Space } from 'antd';

const { Text } = Typography;

export const DslGuide: React.FC = () => {
  return (
    <Alert
      type="info"
      showIcon
      message={
        <div id="frame-test-dsl-guide">
          <Text strong>DSL 语法全指南：</Text>
          <div style={{ marginTop: 8, fontSize: '12px' }}>
            <Space direction="vertical" size={0}>
              <div>• <Text code>[style color=#ff4500 size=24 align=center b i u]文本[/style]</Text> : 颜色、字号、对齐、加粗、斜体、下划线</div>
              <div>• <Text code>[quote=Author id=123 max=100]内容[/quote]</Text> : 引用块，支持嵌套、ID追踪和字数截断</div>
              <div>• <Text code>[image w=300 h=200 mode=cover]URL[/image]</Text> : 图片，支持宽高、缩放、填充模式</div>
              <div>• <Text code>[row gap=10 align=center justify=between]...[/row]</Text> : 行容器，用于图片并排</div>
              <div>• <Text code>[gallery]URL1,URL2[/gallery]</Text> : 自动轮播图集</div>
              <div>• <Text code>[audio src="file.mp3" volume=1.0 start=0]</Text> : 插入音效/背景音</div>
              <div>• <Text code>[\n]</Text> : 强制换行符</div>
            </Space>
          </div>
        </div>
      }
    />
  );
};
