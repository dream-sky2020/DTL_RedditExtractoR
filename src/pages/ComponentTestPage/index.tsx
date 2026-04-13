import React, { useState } from 'react';
import { Card, Button, Space, Typography, Divider, Row, Col, Input } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  QuestionCircleOutlined,
  MessageOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { dialogs } from '../../components/Dialogs';
import { toast } from '../../components/Toast';

const { Title, Text, Paragraph } = Typography;

export const ComponentTestPage: React.FC = () => {
  const [dialogStatus, setDialogStatus] = useState<string>('等待操作...');
  const [toastText, setToastText] = useState<string>('这是一条测试消息');

  const handleConfirm = () => {
    dialogs.confirm({
      title: '确认执行此操作吗？',
      content: '这是一个测试确认框，点击确定后下方的状态文本会发生变化。',
      onOk: () => {
        setDialogStatus('用户点击了：确定 (时间: ' + new Date().toLocaleTimeString() + ')');
        toast.success('操作已确认');
      },
      onCancel: () => {
        setDialogStatus('用户点击了：取消 (时间: ' + new Date().toLocaleTimeString() + ')');
      }
    });
  };

  const handleDangerConfirm = () => {
    dialogs.confirm({
      title: '危险操作确认',
      content: '这是一个危险操作的测试，确认按钮将显示为红色。',
      okType: 'danger',
      okText: '立即删除',
      onOk: () => {
        setDialogStatus('用户确认了危险操作！');
        toast.error('危险操作已执行');
      }
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>组件功能测试</Title>
      <Paragraph>用于验证 <code>Dialogs</code> 和 <code>Toast</code> 统一组件的交互效果。</Paragraph>

      <Row gutter={[24, 24]}>
        {/* Dialogs 测试 */}
        <Col span={12}>
          <Card title="Dialogs (确认弹窗) 测试" bordered={false} className="panel-card">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
                <Text strong>当前状态：</Text>
                <Text type="secondary">{dialogStatus}</Text>
              </div>
              
              <Space wrap>
                <Button type="primary" icon={<QuestionCircleOutlined />} onClick={handleConfirm}>
                  标准确认框
                </Button>
                <Button danger icon={<CloseCircleOutlined />} onClick={handleDangerConfirm}>
                  危险确认框
                </Button>
              </Space>

              <Divider plain>其他类型</Divider>
              
              <Space wrap>
                <Button icon={<InfoCircleOutlined />} onClick={() => dialogs.info({ title: '提示信息', content: '这是一条普通的信息提示。' })}>
                  信息提示
                </Button>
                <Button icon={<CheckCircleOutlined />} onClick={() => dialogs.success({ title: '成功', content: '操作执行成功！' })}>
                  成功提示
                </Button>
                <Button icon={<ExclamationCircleOutlined />} onClick={() => dialogs.warning({ title: '警告', content: '请注意，此操作可能有风险。' })}>
                  警告提示
                </Button>
                <Button icon={<CloseCircleOutlined />} onClick={() => dialogs.error({ title: '错误', content: '系统发生了一个错误。' })}>
                  错误提示
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Toast 测试 */}
        <Col span={12}>
          <Card title="Toast (轻提示) 测试" bordered={false} className="panel-card">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Input 
                placeholder="输入要测试的文本..." 
                value={toastText} 
                onChange={e => setToastText(e.target.value)}
                prefix={<MessageOutlined />}
              />
              
              <Divider plain>基础消息 (Message)</Divider>
              <Space wrap>
                <Button onClick={() => toast.success(toastText)}>成功消息</Button>
                <Button onClick={() => toast.info(toastText)}>信息消息</Button>
                <Button onClick={() => toast.warning(toastText)}>警告消息</Button>
                <Button onClick={() => toast.error(toastText)}>错误消息</Button>
              </Space>

              <Divider plain>带描述的消息 (Notification)</Divider>
              <Space wrap>
                <Button 
                  type="primary" 
                  icon={<NotificationOutlined />}
                  onClick={() => toast.success('操作成功', { description: toastText })}
                >
                  成功通知
                </Button>
                <Button 
                  danger
                  icon={<NotificationOutlined />}
                  onClick={() => toast.error('出现错误', { description: '详细错误信息：' + toastText })}
                >
                  错误通知
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
