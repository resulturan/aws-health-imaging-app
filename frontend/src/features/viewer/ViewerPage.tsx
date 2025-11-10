import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Spin, Typography, Space, Alert } from 'antd';
import { useGetStudyMetadataQuery } from '../../services/api';

const { Title, Text } = Typography;

export default function ViewerPage() {
  const { imageSetId } = useParams<{ imageSetId: string }>();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('sourceId');

  const {
    data: metadataResponse,
    isLoading,
    error,
  } = useGetStudyMetadataQuery(
    { imageSetId: imageSetId!, sourceId: sourceId! },
    { skip: !imageSetId || !sourceId },
  );

  if (!imageSetId || !sourceId) {
    return (
      <Alert
        message="Error"
        description="Missing imageSetId or sourceId"
        type="error"
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading study metadata...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description="Failed to load study metadata"
        type="error"
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card>
        <Title level={3}>DICOM Viewer</Title>
        <Text type="secondary">Image Set ID: {imageSetId}</Text>
      </Card>

      <Card title="Study Information">
        {metadataResponse?.metadata ? (
          <div>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
              {JSON.stringify(metadataResponse.metadata, null, 2)}
            </pre>
          </div>
        ) : (
          <Text>No metadata available</Text>
        )}
      </Card>

      <Card title="Viewer">
        <Alert
          message="DICOM Viewer Integration"
          description={
            <div>
              <p>
                This is a placeholder for the DICOM viewer. To complete the integration:
              </p>
              <ul>
                <li>Install Cornerstone3D dependencies</li>
                <li>Initialize the rendering engine</li>
                <li>Create viewports for displaying images</li>
                <li>
                  Use the DICOM proxy endpoint to fetch frames:
                  <code style={{ marginLeft: 8 }}>
                    /api/dicom-proxy/frames/{'{imageSetId}'}/{'{frameId}'}?sourceId=
                    {'{sourceId}'}
                  </code>
                </li>
                <li>Implement tools (zoom, pan, windowing, measurements)</li>
              </ul>
              <p>
                The backend proxy is fully functional and will handle authentication
                and credential management.
              </p>
            </div>
          }
          type="info"
          showIcon
        />
        <div
          style={{
            marginTop: 16,
            height: 600,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Text style={{ color: '#fff' }}>DICOM Viewer Canvas Placeholder</Text>
        </div>
      </Card>
    </Space>
  );
}
