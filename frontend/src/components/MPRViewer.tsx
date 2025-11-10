import { useEffect, useRef, useState } from 'react';
import { Button, Space, Row, Col, Card, Tooltip, message } from 'antd';
import {
  ZoomInOutlined,
  DragOutlined,
  ColumnWidthOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { initCornerstone } from '../utils/cornerstone';
import { registerCustomImageLoader, createCustomImageId } from '../utils/customImageLoader';

const { RenderingEngine, Enums: csEnums, volumeLoader } = cornerstone;
const { Enums: csToolsEnums } = cornerstoneTools;

interface MPRViewerProps {
  imageSetId: string;
  sourceId: string;
  metadata: any;
  token: string;
}

const RENDERING_ENGINE_ID = 'mprRenderingEngine';
const VOLUME_ID = 'mprVolume';
const TOOL_GROUP_ID = 'MPR_TOOL_GROUP';

const VIEWPORTS = {
  AXIAL: { id: 'AXIAL', name: 'Axial' },
  SAGITTAL: { id: 'SAGITTAL', name: 'Sagittal' },
  CORONAL: { id: 'CORONAL', name: 'Coronal' },
};

export default function MPRViewer({
  imageSetId,
  sourceId,
  metadata,
  token,
}: MPRViewerProps) {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState<string>('WindowLevel');
  const renderingEngineRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function setupMPRViewer() {
      try {
        await initCornerstone();
        registerCustomImageLoader();

        if (!mounted || !axialRef.current || !sagittalRef.current || !coronalRef.current) {
          return;
        }

        // Create rendering engine
        const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        renderingEngineRef.current = renderingEngine;

        // Define viewports
        const viewportInputs = [
          {
            viewportId: VIEWPORTS.AXIAL.id,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: axialRef.current,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.AXIAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: VIEWPORTS.SAGITTAL.id,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: sagittalRef.current,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.SAGITTAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
          {
            viewportId: VIEWPORTS.CORONAL.id,
            type: csEnums.ViewportType.ORTHOGRAPHIC,
            element: coronalRef.current,
            defaultOptions: {
              orientation: csEnums.OrientationAxis.CORONAL,
              background: [0, 0, 0] as [number, number, number],
            },
          },
        ];

        renderingEngine.setViewports(viewportInputs);

        // Setup tool group
        const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

        if (toolGroup) {
          // Add tools
          toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
          toolGroup.addTool(cornerstoneTools.PanTool.toolName);
          toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
          toolGroup.addTool(cornerstoneTools.CrosshairsTool.toolName);

          // Set tool states
          toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          });
          toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
          });
          toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
          });

          // Add viewports to tool group
          Object.values(VIEWPORTS).forEach((viewport) => {
            toolGroup.addViewport(viewport.id, RENDERING_ENGINE_ID);
          });
        }

        // Load volume
        await loadVolume(renderingEngine);

        setIsInitialized(true);
        message.success('MPR viewer initialized successfully');
      } catch (error) {
        console.error('Failed to setup MPR viewer:', error);
        message.error('Failed to initialize MPR viewer');
      }
    }

    setupMPRViewer();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [imageSetId, sourceId, metadata, token]);

  async function loadVolume(renderingEngine: any) {
    try {
      const imageIds = extractImageIds(metadata);

      if (imageIds.length === 0) {
        throw new Error('No image frames found in metadata');
      }

      // Create volume
      const volume = await volumeLoader.createAndCacheVolume(VOLUME_ID, {
        imageIds,
      });

      // Load the volume
      await volume.load();

      // Set volumes on viewports
      await Promise.all(
        Object.values(VIEWPORTS).map(async (viewport) => {
          const vp = renderingEngine.getViewport(viewport.id);
          await vp.setVolumes([
            {
              volumeId: VOLUME_ID,
            },
          ]);
        })
      );

      // Render all viewports
      renderingEngine.render();
    } catch (error) {
      console.error('Failed to load volume:', error);
      throw error;
    }
  }

  function extractImageIds(metadata: any): string[] {
    const imageIds: string[] = [];

    try {
      if (metadata?.Study?.Series) {
        const series = Array.isArray(metadata.Study.Series)
          ? metadata.Study.Series
          : [metadata.Study.Series];

        for (const s of series) {
          if (s?.Instances) {
            const instances = Array.isArray(s.Instances)
              ? s.Instances
              : [s.Instances];

            for (const instance of instances) {
              if (instance?.ImageFrames) {
                const frames = Array.isArray(instance.ImageFrames)
                  ? instance.ImageFrames
                  : [instance.ImageFrames];

                for (const frame of frames) {
                  const frameId = frame.ID || frame.imageFrameId;
                  if (frameId) {
                    const imageId = createCustomImageId(
                      imageSetId,
                      frameId,
                      sourceId,
                      token
                    );
                    imageIds.push(imageId);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting image IDs:', error);
    }

    // Sort image IDs by instance number if available
    return imageIds;
  }

  function cleanup() {
    try {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }

      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
      if (toolGroup) {
        toolGroup.destroy();
      }

      // Remove volume from cache
      const volumeCache = cornerstone.cache.getVolume(VOLUME_ID);
      if (volumeCache) {
        cornerstone.cache.removeVolumeLoadObject(VOLUME_ID);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  function setToolActive(toolName: string) {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (!toolGroup) return;

    const tools = [
      cornerstoneTools.WindowLevelTool.toolName,
      cornerstoneTools.ZoomTool.toolName,
      cornerstoneTools.PanTool.toolName,
      cornerstoneTools.CrosshairsTool.toolName,
    ];

    tools.forEach((tool) => {
      if (tool === toolName) return;
      toolGroup.setToolPassive(tool);
    });

    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });

    setActiveTool(toolName);
  }

  function enableCrosshairs() {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (!toolGroup) return;

    toolGroup.setToolActive(cornerstoneTools.CrosshairsTool.toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });

    setActiveTool(cornerstoneTools.CrosshairsTool.toolName);
    message.info('Crosshairs enabled - click and drag to navigate slices');
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Tooltip title="Window/Level">
          <Button
            icon={<ColumnWidthOutlined />}
            type={activeTool === cornerstoneTools.WindowLevelTool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.WindowLevelTool.toolName)}
          >
            W/L
          </Button>
        </Tooltip>
        <Tooltip title="Zoom">
          <Button
            icon={<ZoomInOutlined />}
            type={activeTool === cornerstoneTools.ZoomTool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.ZoomTool.toolName)}
          >
            Zoom
          </Button>
        </Tooltip>
        <Tooltip title="Pan">
          <Button
            icon={<DragOutlined />}
            type={activeTool === cornerstoneTools.PanTool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.PanTool.toolName)}
          >
            Pan
          </Button>
        </Tooltip>
        <Tooltip title="Crosshairs - Navigate linked views">
          <Button
            icon={<SyncOutlined />}
            type={activeTool === cornerstoneTools.CrosshairsTool.toolName ? 'primary' : 'default'}
            onClick={enableCrosshairs}
          >
            Crosshairs
          </Button>
        </Tooltip>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" title={VIEWPORTS.AXIAL.name} bodyStyle={{ padding: 0 }}>
            <div
              ref={axialRef}
              style={{
                width: '100%',
                height: 400,
                background: '#000',
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title={VIEWPORTS.SAGITTAL.name} bodyStyle={{ padding: 0 }}>
            <div
              ref={sagittalRef}
              style={{
                width: '100%',
                height: 400,
                background: '#000',
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title={VIEWPORTS.CORONAL.name} bodyStyle={{ padding: 0 }}>
            <div
              ref={coronalRef}
              style={{
                width: '100%',
                height: 400,
                background: '#000',
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
