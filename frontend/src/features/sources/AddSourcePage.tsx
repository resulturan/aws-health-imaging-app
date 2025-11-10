import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useCreateImagingSourceMutation } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'sa-east-1',
  'ca-central-1',
];

export default function AddSourcePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [createSource, { isLoading }] = useCreateImagingSourceMutation();
  const [testingConnection, setTestingConnection] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setTestingConnection(true);
      await createSource(values).unwrap();
      message.success('Imaging source created successfully!');
      form.resetFields();
      navigate('/sources');
    } catch (error: any) {
      message.error(
        error?.data?.message || 'Failed to create imaging source. Please check your credentials and try again.'
      );
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCancel = () => {
    navigate('/sources');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={handleCancel}
        style={{ marginBottom: 16 }}
      >
        Back to Sources
      </Button>

      <Card>
        <Title level={2}>Add New Imaging Source</Title>
        <Text type="secondary">
          Connect a new AWS HealthImaging datastore to your application. Your AWS
          credentials will be securely encrypted and stored.
        </Text>

        <Divider />

        <Alert
          message="Security Notice"
          description="AWS credentials are encrypted using AES-256 encryption before storage. The system will test the connection before saving to ensure credentials are valid."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Title level={4}>Basic Information</Title>

          <Form.Item
            name="name"
            label="Source Name"
            rules={[
              { required: true, message: 'Please enter a name for this source' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 100, message: 'Name must not exceed 100 characters' },
            ]}
            tooltip="A friendly name to identify this imaging source"
          >
            <Input
              placeholder="e.g., Main Hospital PACS"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            tooltip="Optional description to provide more context about this source"
          >
            <TextArea
              placeholder="e.g., Primary PACS system for radiology department"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Divider />

          <Title level={4}>AWS Configuration</Title>

          <Form.Item
            name="datastoreId"
            label="Datastore ID"
            rules={[
              { required: true, message: 'Please enter the AWS HealthImaging datastore ID' },
              {
                pattern: /^[a-f0-9]{32}$/,
                message: 'Datastore ID must be a 32-character hexadecimal string',
              },
            ]}
            tooltip="The unique identifier for your AWS HealthImaging datastore"
          >
            <Input
              placeholder="12345678901234567890123456789012"
              size="large"
              maxLength={32}
            />
          </Form.Item>

          <Form.Item
            name="region"
            label="AWS Region"
            rules={[{ required: true, message: 'Please select the AWS region' }]}
            tooltip="The AWS region where your HealthImaging datastore is located"
          >
            <Select
              placeholder="Select AWS region"
              size="large"
              showSearch
              optionFilterProp="children"
            >
              {AWS_REGIONS.map((region) => (
                <Select.Option key={region} value={region}>
                  {region}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Title level={4}>AWS Credentials</Title>

          <Alert
            message="IAM Permissions Required"
            description="The provided credentials must have permissions for: medical-imaging:GetDatastore, medical-imaging:SearchImageSets, and medical-imaging:GetImageSetMetadata"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name={['credentials', 'accessKeyId']}
            label="AWS Access Key ID"
            rules={[
              { required: true, message: 'Please enter your AWS access key ID' },
              {
                pattern: /^[A-Z0-9]{20}$/,
                message: 'Access Key ID must be 20 uppercase alphanumeric characters',
              },
            ]}
            tooltip="Your AWS access key ID (e.g., AKIAIOSFODNN7EXAMPLE)"
          >
            <Input
              placeholder="AKIAIOSFODNN7EXAMPLE"
              size="large"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            name={['credentials', 'secretAccessKey']}
            label="AWS Secret Access Key"
            rules={[
              { required: true, message: 'Please enter your AWS secret access key' },
              { min: 40, message: 'Secret access key must be at least 40 characters' },
            ]}
            tooltip="Your AWS secret access key"
          >
            <Input.Password
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name={['credentials', 'sessionToken']}
            label="Session Token (Optional)"
            tooltip="Required only if using temporary security credentials"
          >
            <Input.Password
              placeholder="Optional - for temporary credentials only"
              size="large"
              autoComplete="off"
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<SaveOutlined />}
                loading={isLoading || testingConnection}
              >
                {testingConnection ? 'Testing Connection...' : 'Create Source'}
              </Button>
              <Button size="large" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </Space>
          </Form.Item>

          {(isLoading || testingConnection) && (
            <Alert
              message="Creating Imaging Source"
              description="Testing AWS connection and encrypting credentials. This may take a few moments..."
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Card>
    </div>
  );
}
