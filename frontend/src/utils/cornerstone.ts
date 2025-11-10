import { init as csRenderInit } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import * as cornerstoneTools from '@cornerstonejs/tools';
import dicomParser from 'dicom-parser';

let initialized = false;

export async function initCornerstone() {
  if (initialized) {
    return;
  }

  try {
    // Initialize Cornerstone Core
    await csRenderInit();

    // Initialize Cornerstone Tools
    csToolsInit();

    // Add all available tools
    cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
    cornerstoneTools.addTool(cornerstoneTools.PanTool);
    cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);
    cornerstoneTools.addTool(cornerstoneTools.WindowLevelTool);
    cornerstoneTools.addTool(cornerstoneTools.LengthTool);
    cornerstoneTools.addTool(cornerstoneTools.RectangleROITool);
    cornerstoneTools.addTool(cornerstoneTools.EllipticalROITool);
    cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
    cornerstoneTools.addTool(cornerstoneTools.ProbeTool);

    initialized = true;
    console.log('Cornerstone initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Cornerstone:', error);
    throw error;
  }
}

export function parseDicomMetadata(buffer: ArrayBuffer) {
  try {
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray);
    return dataSet;
  } catch (error) {
    console.error('Failed to parse DICOM:', error);
    throw error;
  }
}

export { cornerstoneTools };
