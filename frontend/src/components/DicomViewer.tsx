import { useEffect, useRef, useState } from 'react';
import { Button, Space, Tooltip, message } from 'antd';
import {
  ZoomInOutlined,
  DragOutlined,
  ColumnWidthOutlined,
  LineOutlined,
  BorderOutlined,
  AimOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { initCornerstone } from '../utils/cornerstone';
import { registerCustomImageLoader, createCustomImageId } from '../utils/customImageLoader';

const { RenderingEngine, Enums: csEnums } = cornerstone;
const { Enums: csToolsEnums } = cornerstoneTools;

interface DicomViewerProps {
  imageSetId: string;
  sourceId: string;
  metadata: any;
  token: string;
}

const VIEWPORT_ID = 'CT_STACK';
const RENDERING_ENGINE_ID = 'myRenderingEngine';
const TOOL_GROUP_ID = 'STACK_TOOL_GROUP';

export default function DicomViewer({
  imageSetId,
  sourceId,
  metadata,
  token,
}: DicomViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState<string>('WindowLevel');
  const renderingEngineRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function setupViewer() {
      try {
        // Initialize Cornerstone
        await initCornerstone();
        registerCustomImageLoader();

        if (!mounted || !viewportRef.current) return;

        // Create rendering engine
        const renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        renderingEngineRef.current = renderingEngine;

        // Create viewport
        const viewportInput = {
          viewportId: VIEWPORT_ID,
          type: csEnums.ViewportType.STACK,
          element: viewportRef.current,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        };

        renderingEngine.enableElement(viewportInput);

        // Setup tool group
        const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

        if (toolGroup) {
          // Add tools
          toolGroup.addTool(cornerstoneTools.ZoomTool.toolName);
          toolGroup.addTool(cornerstoneTools.PanTool.toolName);
          toolGroup.addTool(cornerstoneTools.StackScrollMouseWheelTool.toolName);
          toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName);
          toolGroup.addTool(cornerstoneTools.LengthTool.toolName);
          toolGroup.addTool(cornerstoneTools.RectangleROITool.toolName);
          toolGroup.addTool(cornerstoneTools.EllipticalROITool.toolName);
          toolGroup.addTool(cornerstoneTools.ProbeTool.toolName);

          // Set initial tool states
          toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
          });
          toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
          });
          toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
            bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
          });
          toolGroup.setToolActive(cornerstoneTools.StackScrollMouseWheelTool.toolName);

          // Add viewport to tool group
          toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
        }

        // Load images
        await loadImages(renderingEngine);

        setIsInitialized(true);
        message.success('DICOM viewer initialized successfully');
      } catch (error) {
        console.error('Failed to setup viewer:', error);
        message.error('Failed to initialize DICOM viewer');
      }
    }

    setupViewer();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [imageSetId, sourceId, metadata, token]);

  async function loadImages(renderingEngine: any) {
    try {
      // Extract image frame IDs from metadata
      const imageIds = extractImageIds(metadata);

      if (imageIds.length === 0) {
        throw new Error('No image frames found in metadata');
      }

      // Get the viewport
      const viewport = renderingEngine.getViewport(VIEWPORT_ID);

      // Set the stack
      await viewport.setStack(imageIds, 0);

      // Render
      viewport.render();
    } catch (error) {
      console.error('Failed to load images:', error);
      throw error;
    }
  }

  function extractImageIds(metadata: any): string[] {
    const imageIds: string[] = [];

    try {
      // Navigate through the metadata structure to find image frame IDs
      // This is a simplified version - adjust based on actual metadata structure
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

    return imageIds;
  }

  function cleanup() {
    try {
      // Destroy rendering engine
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }

      // Destroy tool group
      const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
      if (toolGroup) {
        toolGroup.destroy();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  function setToolActive(toolName: string) {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (!toolGroup) return;

    // Deactivate all primary mouse button tools
    const tools = [
      cornerstoneTools.WindowLevelTool.toolName,
      cornerstoneTools.ZoomTool.toolName,
      cornerstoneTools.PanTool.toolName,
      cornerstoneTools.LengthTool.toolName,
      cornerstoneTools.RectangleROITool.toolName,
      cornerstoneTools.EllipticalROITool.toolName,
      cornerstoneTools.ProbeTool.toolName,
    ];

    tools.forEach((tool) => {
      toolGroup.setToolPassive(tool);
    });

    // Activate the selected tool
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
    });

    setActiveTool(toolName);
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
        <Tooltip title="Length Measurement">
          <Button
            icon={<LineOutlined />}
            type={activeTool === cornerstoneTools.LengthTool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.LengthTool.toolName)}
          >
            Length
          </Button>
        </Tooltip>
        <Tooltip title="Rectangle ROI">
          <Button
            icon={<BorderOutlined />}
            type={activeTool === cornerstoneTools.RectangleROITool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.RectangleROITool.toolName)}
          >
            Rectangle
          </Button>
        </Tooltip>
        <Tooltip title="Elliptical ROI">
          <Button
            icon={<CompassOutlined />}
            type={activeTool === cornerstoneTools.EllipticalROITool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.EllipticalROITool.toolName)}
          >
            Ellipse
          </Button>
        </Tooltip>
        <Tooltip title="Probe">
          <Button
            icon={<AimOutlined />}
            type={activeTool === cornerstoneTools.ProbeTool.toolName ? 'primary' : 'default'}
            onClick={() => setToolActive(cornerstoneTools.ProbeTool.toolName)}
          >
            Probe
          </Button>
        </Tooltip>
      </Space>

      <div
        ref={viewportRef}
        style={{
          width: '100%',
          height: 600,
          background: '#000',
        }}
      />
    </div>
  );
}
