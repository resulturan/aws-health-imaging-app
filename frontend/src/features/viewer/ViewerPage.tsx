import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Spin, Typography, Space, Alert, Collapse, Segmented } from 'antd';
import { AppstoreOutlined, BlockOutlined } from '@ant-design/icons';
import { useGetStudyMetadataQuery } from '../../services/api';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import DicomViewer from '../../components/DicomViewer';
import MPRViewer from '../../components/MPRViewer';

const { Title, Text } = Typography;
const { Panel } = Collapse;

type ViewMode = 'stack' | 'mpr';

export default function ViewerPage() {
  const { imageSetId } = useParams<{ imageSetId: string }>();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('sourceId');
  const token = useSelector((state: RootState) => state.auth.token);
  const [viewMode, setViewMode] = useState<ViewMode>('stack');

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

  if (!token) {
    return (
      <Alert
        message="Authentication Required"
        description="You must be logged in to view DICOM images"
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
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={3}>DICOM Viewer</Title>
          <Text type="secondary">Image Set ID: {imageSetId}</Text>

          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              {
                label: 'Stack View',
                value: 'stack',
                icon: <AppstoreOutlined />,
              },
              {
                label: 'MPR View',
                value: 'mpr',
                icon: <BlockOutlined />,
              },
            ]}
          />
        </Space>
      </Card>

      <Card title={viewMode === 'stack' ? 'Stack Viewer' : 'Multi-Planar Reconstruction (MPR)'}>
        {metadataResponse?.metadata ? (
          viewMode === 'stack' ? (
            <DicomViewer
              imageSetId={imageSetId}
              sourceId={sourceId}
              metadata={metadataResponse.metadata}
              token={token}
            />
          ) : (
            <MPRViewer
              imageSetId={imageSetId}
              sourceId={sourceId}
              metadata={metadataResponse.metadata}
              token={token}
            />
          )
        ) : (
          <Alert
            message="No Metadata"
            description="Unable to load study metadata. The viewer cannot display images without metadata."
            type="warning"
          />
        )}
      </Card>

      <Collapse>
        <Panel header="Study Metadata (Advanced)" key="1">
          {metadataResponse?.metadata ? (
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
              {JSON.stringify(metadataResponse.metadata, null, 2)}
            </pre>
          ) : (
            <Text>No metadata available</Text>
          )}
        </Panel>
      </Collapse>
    </Space>
  );
}
