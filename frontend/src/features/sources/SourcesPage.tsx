import { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useGetImagingSourcesQuery,
  useCreateImagingSourceMutation,
  useUpdateImagingSourceMutation,
  useDeleteImagingSourceMutation,
  ImagingSource,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
];

export default function SourcesPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ImagingSource | null>(null);
  const [form] = Form.useForm();

  const { data: sources, isLoading } = useGetImagingSourcesQuery();
  const [createSource, { isLoading: isCreating }] = useCreateImagingSourceMutation();
  const [updateSource, { isLoading: isUpdating }] = useUpdateImagingSourceMutation();
  const [deleteSource] = useDeleteImagingSourceMutation();

  const canManageSources =
    user?.role === 'ADMIN' || user?.role === 'SOURCE_MANAGER';

  const handleCreate = () => {
    setEditingSource(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (source: ImagingSource) => {
    setEditingSource(source);
    form.setFieldsValue({
      name: source.name,
      description: source.description,
      datastoreId: source.datastoreId,
      region: source.region,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSource(id).unwrap();
      message.success('Source deleted successfully');
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to delete source');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSource) {
        await updateSource({ id: editingSource.id, data: values }).unwrap();
        message.success('Source updated successfully');
      } else {
        await createSource(values).unwrap();
        message.success('Source created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      message.error(
        error?.data?.message ||
          `Failed to ${editingSource ? 'update' : 'create'} source`,
      );
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Datastore ID',
      dataIndex: 'datastoreId',
      key: 'datastoreId',
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Owner',
      dataIndex: ['owner', 'email'],
      key: 'owner',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ImagingSource) => (
        <Space>
          {canManageSources && record.owner.id === user?.id && (
            <>
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
              >
                Edit
              </Button>
              <Popconfirm
                title="Are you sure you want to delete this source?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />} size="small" danger>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Imaging Sources"
      extra={
        canManageSources && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Source
          </Button>
        )
      }
    >
      <Table
        columns={columns}
        dataSource={sources}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        title={editingSource ? 'Edit Source' : 'Add Source'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="My HealthImaging Source" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional description" rows={3} />
          </Form.Item>

          <Form.Item
            name="datastoreId"
            label="Datastore ID"
            rules={[{ required: true, message: 'Please enter datastore ID' }]}
          >
            <Input placeholder="12345678901234567890123456" />
          </Form.Item>

          <Form.Item
            name="region"
            label="AWS Region"
            rules={[{ required: true, message: 'Please select a region' }]}
          >
            <Select placeholder="Select region">
              {AWS_REGIONS.map((region) => (
                <Select.Option key={region} value={region}>
                  {region}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {!editingSource && (
            <>
              <Form.Item
                name={['credentials', 'accessKeyId']}
                label="AWS Access Key ID"
                rules={[{ required: true, message: 'Please enter access key ID' }]}
              >
                <Input placeholder="AKIAIOSFODNN7EXAMPLE" />
              </Form.Item>

              <Form.Item
                name={['credentials', 'secretAccessKey']}
                label="AWS Secret Access Key"
                rules={[
                  { required: true, message: 'Please enter secret access key' },
                ]}
              >
                <Input.Password placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
              </Form.Item>

              <Form.Item
                name={['credentials', 'sessionToken']}
                label="Session Token (optional)"
              >
                <Input.Password placeholder="Optional session token" />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isCreating || isUpdating}
              >
                {editingSource ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
