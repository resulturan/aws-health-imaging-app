import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Badge, Popover, List, Button, Space } from 'antd';
import {
  DatabaseOutlined,
  TeamOutlined,
  EyeOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  WifiOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, notifications, clearNotifications, removeNotification } = useNotifications();

  const menuItems = [
    {
      key: '/sources',
      icon: <DatabaseOutlined />,
      label: 'Imaging Sources',
    },
    {
      key: '/patients',
      icon: <TeamOutlined />,
      label: 'Patients & Studies',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const notificationsContent = (
    <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text strong>Notifications</Text>
        {notifications.length > 0 && (
          <Button size="small" type="link" onClick={clearNotifications}>
            Clear All
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text type="secondary">No notifications</Text>
        </div>
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeNotification(index)}
                />,
              ]}
            >
              <List.Item.Meta
                title={item.type.replace(':', ' ')}
                description={
                  <div>
                    <div>{new Date(item.timestamp).toLocaleString()}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {JSON.stringify(item.data).substring(0, 100)}...
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? <EyeOutlined /> : 'Health Imaging'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Space>
              <Badge status={isConnected ? 'success' : 'default'} />
              <Text type="secondary">
                {isConnected ? 'Real-time updates enabled' : 'Offline'}
              </Text>
            </Space>
          </div>
          <Space size="large">
            <Popover
              content={notificationsContent}
              title={null}
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={notifications.length} offset={[10, 0]}>
                <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
              </Badge>
            </Popover>
            <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }}>
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                <Text>
                  {user?.email} ({user?.role})
                </Text>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
