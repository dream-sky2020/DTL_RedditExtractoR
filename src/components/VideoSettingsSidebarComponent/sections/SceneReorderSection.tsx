import React, { useState } from 'react';
import { Button, Space, Typography, InputNumber, Select, Tooltip, Divider } from 'antd';
import {
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  FontSizeOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import { useSceneReorder } from '../../../hooks/useSceneReorder';
import { toast } from '@components/Toast';

const { Text } = Typography;
const { Option } = Select;

interface SceneReorderSectionProps {
  selectedSceneIds: string[];
  totalScenes: number;
}

export const SceneReorderSection: React.FC<SceneReorderSectionProps> = ({
  selectedSceneIds,
  totalScenes,
}) => {
  const {
    moveSelectedToStart,
    moveSelectedToEnd,
    moveSelectedToIndex,
    sortScenes
  } = useSceneReorder();

  const [targetIndex, setTargetIndex] = useState<number>(1);
  const [insertPosition, setInsertPosition] = useState<'before' | 'after'>('before');

  const handleMoveToIndex = () => {
    moveSelectedToIndex(selectedSceneIds, targetIndex - 1, insertPosition);
    toast.success(`已移动到第 ${targetIndex} 个画面格${insertPosition === 'before' ? '之前' : '之后'}`);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Divider style={{ margin: '8px 0' }} />
      
      <div>
        <div style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>快速重排</Text>
        </div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button 
              icon={<VerticalAlignTopOutlined />} 
              disabled={selectedSceneIds.length === 0}
              onClick={() => {
                moveSelectedToStart(selectedSceneIds);
                toast.success('已移动到最前');
              }}
              style={{
                backgroundColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#f5f5f5',
                color: selectedSceneIds.length > 0 ? '#000' : '#bfbfbf',
                borderColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#d9d9d9',
              }}
            >
              移至最前
            </Button>
            <Button 
              icon={<VerticalAlignBottomOutlined />} 
              disabled={selectedSceneIds.length === 0}
              onClick={() => {
                moveSelectedToEnd(selectedSceneIds);
                toast.success('已移动到最后');
              }}
              style={{
                backgroundColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#f5f5f5',
                color: selectedSceneIds.length > 0 ? '#000' : '#bfbfbf',
                borderColor: selectedSceneIds.length > 0 ? '#ffec3d' : '#d9d9d9',
              }}
            >
              移至最后
            </Button>
          </Space>
          
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 4 }}>
            <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>移动到第</Text>
            <InputNumber 
              size="small" 
              min={1} 
              max={totalScenes} 
              value={targetIndex} 
              onChange={(val) => setTargetIndex(val || 1)}
              style={{ width: 60 }}
            />
            <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>个</Text>
            <Select 
              size="small" 
              value={insertPosition} 
              onChange={setInsertPosition}
              style={{ width: 70 }}
            >
              <Option value="before">之前</Option>
              <Option value="after">之后</Option>
            </Select>
            <Button 
              size="small" 
              icon={<ArrowRightOutlined />}
              disabled={selectedSceneIds.length === 0}
              onClick={handleMoveToIndex}
              style={{
                backgroundColor: selectedSceneIds.length > 0 ? '#fff' : '#f5f5f5',
                color: selectedSceneIds.length > 0 ? '#000' : '#bfbfbf',
                borderColor: selectedSceneIds.length > 0 ? '#d9d9d9' : '#d9d9d9',
              }}
            />
          </div>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <div style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: 'var(--text-primary)' }}>排序建议 {selectedSceneIds.length > 0 ? '(仅对选中项)' : '(全局)'}</Text>
        </div>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <Tooltip title={selectedSceneIds.length > 0 ? "按场景时长对选中项排序" : "按场景时长对所有项排序"}>
            <Button 
              size="small" 
              icon={<ClockCircleOutlined />} 
              onClick={() => {
                sortScenes('duration', selectedSceneIds);
                toast.success(selectedSceneIds.length > 0 ? '已对选中场景按时长排序' : '已按时长排序');
              }}
            >
              时长排序
            </Button>
          </Tooltip>
          <Tooltip title={selectedSceneIds.length > 0 ? "按文本字数对选中项排序" : "按文本字数对所有项排序"}>
            <Button 
              size="small" 
              icon={<FontSizeOutlined />} 
              onClick={() => {
                sortScenes('textLength', selectedSceneIds);
                toast.success(selectedSceneIds.length > 0 ? '已对选中场景按字数排序' : '已按字数排序');
              }}
            >
              字数排序
            </Button>
          </Tooltip>
          {selectedSceneIds.length >= 2 && (
            <Tooltip title="根据你点击选择的先后顺序重新排列选中项的位置">
              <Button 
                size="small" 
                icon={<OrderedListOutlined />} 
                onClick={() => {
                  sortScenes('selectionOrder', selectedSceneIds);
                  toast.success('已根据选择顺序重新排列');
                }}
                style={{
                  backgroundColor: '#e6f7ff',
                  borderColor: '#91d5ff',
                  color: '#1890ff'
                }}
              >
                选择顺序
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </Space>
  );
};
