import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Input,
  Select,
  Space,
  Button,
  Tag,
  Typography,
  Empty,
  message,
} from 'antd';
import { SearchOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  useGetImagingSourcesQuery,
  useSearchPatientsQuery,
  useExportStudyMutation,
  Patient,
  Study,
} from '../../services/api';

const { Search } = Input;
const { Title } = Typography;

export default function PatientsPage() {
  const navigate = useNavigate();
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: sources } = useGetImagingSourcesQuery();
  const { data: patientsData, isLoading } = useSearchPatientsQuery(
    {
      sourceId: selectedSource,
      search: searchTerm,
      limit: pageSize,
    },
    {
      skip: !selectedSource,
    },
  );
  const [exportStudy, { isLoading: isExporting }] = useExportStudyMutation();

  const handleExportStudy = async (study: Study) => {
    try {
      message.loading({ content: 'Exporting study...', key: 'export', duration: 0 });
      const blob = await exportStudy({
        imageSetId: study.imageSetId,
        sourceId: selectedSource,
      }).unwrap();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `study_${study.imageSetId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Study exported successfully!', key: 'export' });
    } catch (error) {
      console.error('Failed to export study:', error);
      message.error({ content: 'Failed to export study', key: 'export' });
    }
  };

  const expandedRowRender = (patient: Patient) => {
    const studyColumns = [
      {
        title: 'Study Date',
        dataIndex: 'studyDate',
        key: 'studyDate',
        render: (date: string) => date || 'N/A',
      },
      {
        title: 'Study Description',
        dataIndex: 'studyDescription',
        key: 'studyDescription',
        render: (desc: string) => desc || 'N/A',
      },
      {
        title: 'Modality',
        dataIndex: 'modality',
        key: 'modality',
        render: (modality: string) => (
          <Tag color="blue">{modality || 'N/A'}</Tag>
        ),
      },
      {
        title: 'Series',
        dataIndex: 'numberOfStudyRelatedSeries',
        key: 'series',
      },
      {
        title: 'Instances',
        dataIndex: 'numberOfStudyRelatedInstances',
        key: 'instances',
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, study: Study) => (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(
                  `/viewer/${study.imageSetId}?sourceId=${selectedSource}`,
                )
              }
            >
              View
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleExportStudy(study)}
              loading={isExporting}
            >
              Export
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <Table
        columns={studyColumns}
        dataSource={patient.studies}
        rowKey="imageSetId"
        pagination={false}
        size="small"
      />
    );
  };

  const columns = [
    {
      title: 'Patient ID',
      dataIndex: 'patientId',
      key: 'patientId',
    },
    {
      title: 'Patient Name',
      dataIndex: 'patientName',
      key: 'patientName',
    },
    {
      title: 'Birth Date',
      dataIndex: 'patientBirthDate',
      key: 'patientBirthDate',
      render: (date: string) => date || 'N/A',
    },
    {
      title: 'Sex',
      dataIndex: 'patientSex',
      key: 'patientSex',
      render: (sex: string) => sex || 'N/A',
    },
    {
      title: 'Studies',
      key: 'studies',
      render: (patient: Patient) => patient.studies.length,
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>Search Patients</Title>
          <Space style={{ width: '100%' }}>
            <Select
              style={{ width: 300 }}
              placeholder="Select imaging source"
              value={selectedSource || undefined}
              onChange={setSelectedSource}
              options={sources?.map((source) => ({
                label: source.name,
                value: source.id,
              }))}
            />
            <Search
              placeholder="Search by patient ID or name"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={setSearchTerm}
              style={{ width: 400 }}
              disabled={!selectedSource}
            />
          </Space>
        </Space>
      </Card>

      {!selectedSource ? (
        <Card>
          <Empty description="Please select an imaging source to view patients" />
        </Card>
      ) : (
        <Card title="Patients & Studies">
          <Table
            columns={columns}
            dataSource={patientsData?.patients}
            rowKey="patientId"
            loading={isLoading}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => record.studies.length > 0,
            }}
            pagination={{
              current: page,
              pageSize,
              total: patientsData?.total,
              onChange: setPage,
            }}
          />
        </Card>
      )}
    </Space>
  );
}
