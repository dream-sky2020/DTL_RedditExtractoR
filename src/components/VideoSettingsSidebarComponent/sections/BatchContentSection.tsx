import React from 'react';
import { Button, Typography, InputNumber, Tooltip, Select, Input } from 'antd';
import { applyItemIndexChange } from '../../../hooks/multiSelectUtils';
import { InsertTextMode } from '../../../hooks/useBatchTextActions';

const { Text } = Typography;
const { Option } = Select;

interface BatchContentSectionProps {
  selectedSceneIds: string[];
  insertTextItemIndex: number;
  setInsertTextItemIndex: (val: number) => void;
  insertTextMode: InsertTextMode;
  setInsertTextMode: (val: InsertTextMode) => void;
  insertTextValue: string;
  setInsertTextValue: (val: string) => void;
  insertTextWeightedOptions: string;
  setInsertTextWeightedOptions: (val: string) => void;
  animationItemIndex: number;
  setAnimationItemIndex: (val: number) => void;
  animationKeyframes: string;
  setAnimationKeyframes: (val: string) => void;
  canInsertText: boolean;
  handleBatchInsertTextToItem: () => void;
  handleBatchItemKeyframesChange: () => void;
}

export const BatchContentSection: React.FC<BatchContentSectionProps> = ({
  selectedSceneIds,
  insertTextItemIndex,
  setInsertTextItemIndex,
  insertTextMode,
  setInsertTextMode,
  insertTextValue,
  setInsertTextValue,
  insertTextWeightedOptions,
  setInsertTextWeightedOptions,
  animationItemIndex,
  setAnimationItemIndex,
  animationKeyframes,
  setAnimationKeyframes,
  canInsertText,
  handleBatchInsertTextToItem,
  handleBatchItemKeyframesChange,
}) => {
  const hasSelected = selectedSceneIds.length > 0;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>插入项:</Text>
        <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
          <InputNumber
            size="small"
            step={1}
            placeholder="索引"
            value={insertTextItemIndex}
            onChange={(val) => applyItemIndexChange(val, insertTextItemIndex, setInsertTextItemIndex)}
            style={{ width: 55 }}
          />
        </Tooltip>
        <Select
          size="small"
          value={insertTextMode}
          onChange={setInsertTextMode}
          style={{ width: 92 }}
        >
          <Option value="fixed">固定</Option>
          <Option value="weightedRandom">随机权重</Option>
        </Select>
        {insertTextMode === 'fixed' && (
          <Input
            size="small"
            placeholder="输入要插入的文本"
            value={insertTextValue}
            onChange={(e) => setInsertTextValue(e.target.value)}
            style={{ flex: 1 }}
          />
        )}
        <Button
          size="small"
          disabled={!canInsertText}
          onClick={handleBatchInsertTextToItem}
          style={{
            backgroundColor: canInsertText ? '#fa8c16' : '#fff',
            color: canInsertText ? '#fff' : '#000',
            borderColor: canInsertText ? '#fa8c16' : 'var(--brand-border)',
          }}
        >
          插入文本
        </Button>
      </div>
      {insertTextMode === 'weightedRandom' && (
        <Input.TextArea
          size="small"
          placeholder={'每行一个：文本 | 权重\n例如：哈哈 | 3\n例如：不错 | 1'}
          value={insertTextWeightedOptions}
          onChange={(e) => setInsertTextWeightedOptions(e.target.value)}
          autoSize={{ minRows: 2, maxRows: 5 }}
          style={{ marginTop: 4 }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', paddingTop: 4 }}>动画项:</Text>
        <Tooltip title="正数从前往后(1,2...)，负数从后往前(-1,-2...)">
          <InputNumber
            size="small"
            step={1}
            placeholder="索引"
            value={animationItemIndex}
            onChange={(val) => applyItemIndexChange(val, animationItemIndex, setAnimationItemIndex)}
            style={{ width: 55 }}
          />
        </Tooltip>
        <Input.TextArea
          size="small"
          placeholder="输入 item keyframes，留空则清除"
          value={animationKeyframes}
          onChange={(e) => setAnimationKeyframes(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 3 }}
          style={{ flex: 1 }}
        />
        <Button
          size="small"
          disabled={!hasSelected}
          onClick={handleBatchItemKeyframesChange}
          style={{
            backgroundColor: hasSelected ? '#fa8c16' : '#fff',
            color: hasSelected ? '#fff' : '#000',
            borderColor: hasSelected ? '#fa8c16' : 'var(--brand-border)',
          }}
        >
          修改动画
        </Button>
      </div>
    </div>
  );
};
