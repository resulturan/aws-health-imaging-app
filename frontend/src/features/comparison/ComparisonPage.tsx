import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Alert, Spin, Button } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useGetStudyMetadataQuery } from '../../services/api';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import DicomViewer from '../../components/DicomViewer';

const { Title, Text } = Typography;

export default function ComparisonPage() {
  const [searchParams] = useSearchParams();
  const token = useSelector((state: RootState) => state.auth.token);

  // Parse multiple studies from URL parameters
  const studies = [
    {
      imageSetId: searchParams.get('study1'),
      sourceId: searchParams.get('source1'),
    },
    {
      imageSetId: searchParams.get('study2'),
      sourceId: searchParams.get('source2'),
    },
    {
      imageSetId: searchParams.get('study3'),
      sourceId: searchParams.get('source3'),
    },
    {
      imageSetId: searchParams.get('study4'),
      sourceId: searchParams.get('source4'),
    },
  ].filter((s) => s.imageSetId && s.sourceId);

  if (!token) {
    return (
      <Alert
        message="Authentication Required"
        description="You must be logged in to view DICOM images"
        type="error"
      />
    );
  }

  if (studies.length === 0) {
    return (
      <Alert
        message="No Studies Selected"
        description="Please select at least one study to compare. Use URL parameters: ?study1=xxx&source1=yyy"
        type="warning"
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card>
        <Title level={3}>Study Comparison</Title>
        <Text type="secondary">Comparing {studies.length} studies side-by-side</Text>
      </Card>

      <Row gutter={[16, 16]}>
        {studies.map((study, index) => (
          <Col
            key={`${study.imageSetId}-${index}`}
            span={studies.length === 1 ? 24 : studies.length === 2 ? 12 : 12}
          >
            <StudyViewerCard
              imageSetId={study.imageSetId!}
              sourceId={study.sourceId!}
              token={token}
              index={index + 1}
            />
          </Col>
        ))}
      </Row>
    </Space>
  );
}

interface StudyViewerCardProps {
  imageSetId: string;
  sourceId: string;
  token: string;
  index: number;
}

function StudyViewerCard({ imageSetId, sourceId, token, index }: StudyViewerCardProps) {
  const {
    data: metadataResponse,
    isLoading,
    error,
  } = useGetStudyMetadataQuery({ imageSetId, sourceId });

  if (isLoading) {
    return (
      <Card title={`Study ${index}`}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading study...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title={`Study ${index}`}>
        <Alert
          message="Error"
          description="Failed to load study metadata"
          type="error"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>Study {index}</span>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {imageSetId.substring(0, 8)}...
          </Text>
        </Space>
      }
    >
      {metadataResponse?.metadata ? (
        <DicomViewer
          imageSetId={imageSetId}
          sourceId={sourceId}
          metadata={metadataResponse.metadata}
          token={token}
        />
      ) : (
        <Alert
          message="No Metadata"
          description="Unable to load study metadata"
          type="warning"
        />
      )}
    </Card>
  );
}
