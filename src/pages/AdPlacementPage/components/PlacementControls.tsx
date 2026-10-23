import { Alert, Button, Card, Col, InputNumber, Row, Slider, Space, Switch, Typography } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import type { PositionPreset } from '../types';

const { Text } = Typography;

interface PlacementControlsProps {
  x: number;
  y: number;
  width: number;
  adNormalizedHeight: number;
  autoCenterPlacement: boolean;
  setAutoCenterPlacement: (enabled: boolean) => void;
  setX: (value: number) => void;
  setY: (value: number) => void;
  updateWidthKeepingCenter: (width: number) => void;
  applyPreset: (preset: PositionPreset) => void;
}

export function PlacementControls({
  x, y, width, adNormalizedHeight, autoCenterPlacement,
  setAutoCenterPlacement, setX, setY, updateWidthKeepingCenter, applyPreset,
}: PlacementControlsProps) {
  return (
    <Card title="3. 位置和大小" style={{ marginTop: 24 }}>
      <Alert
        type="info"
        showIcon
        message="最终画布始终保持母片尺寸"
        description="广告可以放大到 500%；超出母片显示范围的部分会直接裁掉，不会扩大成片分辨率。"
        style={{ marginBottom: 20 }}
      />
      <Space direction="vertical" style={{ width: '100%', marginBottom: 20 }}>
        <Space wrap>
          <Text><AimOutlined /> 自动居中模式</Text>
          <Switch
            checked={autoCenterPlacement}
            onChange={setAutoCenterPlacement}
            checkedChildren="已开启"
            unCheckedChildren="已关闭"
          />
        </Space>
        <Text type="secondary">
          开启后持续按当前广告宽高计算 X {Math.round((1 - width) / 2 * 100)}%、Y {Math.round((1 - adNormalizedHeight) / 2 * 100)}%；调整宽度或更换素材后也会自动重新居中。负数表示对称裁剪。
        </Text>
      </Space>
      <Space wrap style={{ marginBottom: 20 }}>
        <Text>其他快速位置：</Text>
        <Button onClick={() => applyPreset('top-left')}>左上</Button>
        <Button onClick={() => applyPreset('top-right')}>右上</Button>
        <Button onClick={() => applyPreset('bottom-left')}>左下</Button>
        <Button onClick={() => applyPreset('bottom-right')}>右下</Button>
      </Space>
      <Row gutter={20}>
        <Col xs={24} md={8}>
          <Text>横向位置：{Math.round(x * 100)}%</Text>
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Slider
              disabled={autoCenterPlacement}
              min={-5}
              max={1}
              step={0.01}
              value={x}
              onChange={setX}
              style={{ flex: 1, marginInline: 10 }}
            />
            <InputNumber<number>
              disabled={autoCenterPlacement}
              min={-500}
              max={100}
              step={1}
              value={Math.round(x * 100)}
              formatter={(value) => `${value ?? 0}%`}
              parser={(value) => {
                const parsed = Number((value || '').replace(/[^\d.-]/g, ''));
                return Number.isFinite(parsed) ? parsed : 0;
              }}
              onChange={(value) => setX((value ?? 0) / 100)}
              style={{ width: 100 }}
            />
          </Space.Compact>
        </Col>
        <Col xs={24} md={8}>
          <Text>纵向位置：{Math.round(y * 100)}%</Text>
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Slider
              disabled={autoCenterPlacement}
              min={-5}
              max={1}
              step={0.01}
              value={y}
              onChange={setY}
              style={{ flex: 1, marginInline: 10 }}
            />
            <InputNumber<number>
              disabled={autoCenterPlacement}
              min={-500}
              max={100}
              step={1}
              value={Math.round(y * 100)}
              formatter={(value) => `${value ?? 0}%`}
              parser={(value) => {
                const parsed = Number((value || '').replace(/[^\d.-]/g, ''));
                return Number.isFinite(parsed) ? parsed : 0;
              }}
              onChange={(value) => setY((value ?? 0) / 100)}
              style={{ width: 100 }}
            />
          </Space.Compact>
        </Col>
        <Col xs={24} md={8}>
          <Text>广告宽度：{Math.round(width * 100)}%</Text>
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Slider
              min={0.05}
              max={5}
              step={0.01}
              value={width}
              onChange={updateWidthKeepingCenter}
              style={{ flex: 1, marginInline: 10 }}
            />
            <InputNumber<number>
              min={5}
              max={500}
              step={1}
              value={Math.round(width * 100)}
              formatter={(value) => `${value ?? 5}%`}
              parser={(value) => {
                const parsed = Number((value || '').replace(/[^\d.]/g, ''));
                return Number.isFinite(parsed) ? parsed : 5;
              }}
              onChange={(value) => updateWidthKeepingCenter((value ?? 5) / 100)}
              style={{ width: 100 }}
            />
          </Space.Compact>
          <Text type="secondary">调整宽度时保持广告中心位置不变，超出母片的部分仍会裁掉。</Text>
        </Col>
      </Row>
    </Card>
  );
}
