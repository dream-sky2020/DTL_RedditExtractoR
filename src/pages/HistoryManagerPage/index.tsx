import React, { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Input,
  Form,
  Typography,
  Tag,
  InputNumber,
  Empty,
  Tooltip,
  Select,
} from 'antd';
import {
  FileSearchOutlined,
  FilterOutlined,
  LinkOutlined,
  HistoryOutlined,
  DeleteOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { toast } from '@components/Toast';

const { Title, Text } = Typography;
const { Option } = Select;

const formatTimestamp = (ts: number) => {
  if (!ts) return '-';
  // 某些历史记录的时间戳可能是微秒或带小数的毫秒
  const date = new Date(ts > 1e12 ? ts : ts * 1000);
  return date.toLocaleString();
};

export const HistoryManagerPage: React.FC = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const [form] = Form.useForm();

  const handlePickFile = async () => {
    try {
      const response = await fetch('http://localhost:5000/pick_file');
      const result = await response.json();
      if (result.success && result.path) {
        setFileName(result.path);
        // 这里我们通过另一个代理接口读取文件内容，或者直接让后端处理
        // 为了简单起见，我们假设前端可以直接读取（如果是在本地开发环境）
        // 但更好的做法是让后端直接处理文件路径
        toast.success('已选择文件: ' + result.path);
      }
    } catch (error) {
      toast.error('选择文件失败');
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setHistoryData(json);
          setFileName(file.name);
          toast.success(`成功加载 ${json.length} 条记录`);
        } else {
          toast.error('JSON 格式错误：应为数组');
        }
      } catch (err) {
        toast.error('解析 JSON 失败');
      }
    };
    reader.readAsText(file);
  };

  const handleFilter = async () => {
    if (historyData.length === 0) {
      toast.warning('请先加载历史记录文件');
      return;
    }

    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const rules = {
        include: {
          url_contains: values.urlContains ? [values.urlContains] : [],
          title_contains: values.titleContains ? [values.titleContains] : [],
        },
        exclude: {
          title_contains: values.excludeTitle ? [values.excludeTitle] : [],
        },
        min_visit_count: values.minVisitCount || 0,
        sort_by: values.sortBy || 'visitCount',
        reverse: true,
      };

      const response = await fetch('http://localhost:5000/filter_history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: historyData,
          rules: rules,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFilteredResults(result.results);
        toast.success(`过滤完成，找到 ${result.count} 条记录`);
      } else {
        toast.error('过滤失败: ' + result.message);
      }
    } catch (error) {
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <div style={{ maxWidth: 400 }}>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.url}
          </Text>
        </div>
      ),
    },
    {
      title: '访问次数',
      dataIndex: 'visitCount',
      key: 'visitCount',
      width: 100,
      sorter: (a: any, b: any) => a.visitCount - b.visitCount,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '最后访问时间',
      dataIndex: 'lastVisitTime',
      key: 'lastVisitTime',
      width: 180,
      sorter: (a: any, b: any) => a.lastVisitTime - b.lastVisitTime,
      render: (ts: number) => <Text style={{ fontSize: '12px' }}>{formatTimestamp(ts)}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'isPost',
      key: 'isPost',
      render: (isPost: boolean) => (
        isPost ? <Tag color="green">帖子</Tag> : <Tag>其他</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<LinkOutlined />}
          href={record.url}
          target="_blank"
        >
          打开
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title={<Space><HistoryOutlined /> 浏览历史管理</Space>} variant="borderless">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" type="inner" title="1. 加载历史记录 (JSON)">
            <Space>
              <Button icon={<FileSearchOutlined />} onClick={() => document.getElementById('history-upload')?.click()}>
                选择 JSON 文件
              </Button>
              <input
                id="history-upload"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              {fileName && <Text type="secondary">当前文件: {fileName}</Text>}
              <Button danger icon={<DeleteOutlined />} onClick={() => {
                setHistoryData([]);
                setFilteredResults([]);
                setFileName('');
              }} disabled={!fileName}>
                清除
              </Button>
            </Space>
          </Card>

          <Card size="small" type="inner" title="2. 设置过滤规则">
            <Form
              form={form}
              layout="inline"
              initialValues={{
                urlContains: 'reddit.com/r/limbuscompany',
                minVisitCount: 1,
                sortBy: 'visitCount',
              }}
            >
              <Form.Item name="urlContains" label="URL 包含">
                <Input placeholder="例如: reddit.com/r/limbuscompany" style={{ width: 250 }} />
              </Form.Item>
              <Form.Item name="titleContains" label="标题包含">
                <Input placeholder="关键词..." style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="excludeTitle" label="排除标题">
                <Input placeholder="排除关键词..." style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="minVisitCount" label="最小访问次数">
                <InputNumber min={0} style={{ width: 60 }} />
              </Form.Item>
              <Form.Item name="sortBy" label="排序方式">
                <Select style={{ width: 120 }}>
                  <Option value="visitCount">访问次数</Option>
                  <Option value="lastVisitTime">最后访问时间</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  onClick={handleFilter}
                  loading={loading}
                >
                  应用过滤
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {filteredResults.length > 0 ? (
            <Table
              className="light-data-table"
              dataSource={filteredResults}
              columns={columns}
              rowKey="id"
              pagination={{ 
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total) => `共 ${total} 条记录`,
                position: ['bottomRight'],
              }}
              onChange={(newPagination) => {
                setPagination({
                  current: newPagination.current || 1,
                  pageSize: newPagination.pageSize || 10,
                });
              }}
            />
          ) : (
            <Empty description="暂无过滤结果，请调整规则并点击“应用过滤”" />
          )}
        </Space>
      </Card>
    </div>
  );
};
