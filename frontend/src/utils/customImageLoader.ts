import * as cornerstone from '@cornerstonejs/core';
import dicomParser from 'dicom-parser';

const { registerImageLoader } = cornerstone.imageLoader;

interface ImageLoaderOptions {
  imageSetId: string;
  sourceId: string;
  token: string;
}

function createImageObject(imageId: string, pixelData: ArrayBuffer, metadata: any) {
  const dataSet = dicomParser.parseDicom(new Uint8Array(pixelData));

  // Extract key DICOM attributes
  const rows = dataSet.uint16('x00280010');
  const columns = dataSet.uint16('x00280011');
  const bitsAllocated = dataSet.uint16('x00280100');
  const bitsStored = dataSet.uint16('x00280101');
  const samplesPerPixel = dataSet.uint16('x00280002');
  const pixelRepresentation = dataSet.uint16('x00280103');
  const photometricInterpretation = dataSet.string('x00280004');

  // Get window/level values
  const windowCenter = dataSet.floatString('x00281050');
  const windowWidth = dataSet.floatString('x00281051');

  // Get pixel data
  const pixelDataElement = dataSet.elements.x7fe00010;
  const pixelDataOffset = pixelDataElement.dataOffset;
  const pixelDataLength = pixelDataElement.length;

  // Create typed array for pixel data
  let pixelDataArray;
  if (bitsAllocated === 16) {
    if (pixelRepresentation === 0) {
      pixelDataArray = new Uint16Array(
        pixelData,
        pixelDataOffset,
        pixelDataLength / 2
      );
    } else {
      pixelDataArray = new Int16Array(
        pixelData,
        pixelDataOffset,
        pixelDataLength / 2
      );
    }
  } else {
    pixelDataArray = new Uint8Array(
      pixelData,
      pixelDataOffset,
      pixelDataLength
    );
  }

  return {
    imageId,
    minPixelValue: pixelRepresentation === 0 ? 0 : -32768,
    maxPixelValue: pixelRepresentation === 0 ? 65535 : 32767,
    slope: 1,
    intercept: 0,
    windowCenter: windowCenter ? parseFloat(windowCenter) : undefined,
    windowWidth: windowWidth ? parseFloat(windowWidth) : undefined,
    rows,
    columns,
    height: rows,
    width: columns,
    color: samplesPerPixel > 1,
    columnPixelSpacing: 1,
    rowPixelSpacing: 1,
    sizeInBytes: pixelDataLength,
    getPixelData: () => pixelDataArray,
  };
}

async function customImageLoader(imageId: string): Promise<any> {
  // Parse the custom image ID format: "custom://imageSetId/frameId?sourceId=xxx&token=xxx"
  const url = imageId.replace('custom://', '');
  const [path, queryString] = url.split('?');
  const [imageSetId, frameId] = path.split('/');

  const params = new URLSearchParams(queryString);
  const sourceId = params.get('sourceId');
  const token = params.get('token');

  if (!imageSetId || !frameId || !sourceId || !token) {
    throw new Error('Invalid image ID format');
  }

  // Fetch the DICOM frame from our proxy
  const response = await fetch(
    `/api/dicom-proxy/frames/${imageSetId}/${frameId}?sourceId=${sourceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // Create and return the image object
  return createImageObject(imageId, arrayBuffer, {});
}

export function registerCustomImageLoader() {
  registerImageLoader('custom', customImageLoader);
}

export function createCustomImageId(
  imageSetId: string,
  frameId: string,
  sourceId: string,
  token: string
): string {
  return `custom://${imageSetId}/${frameId}?sourceId=${sourceId}&token=${token}`;
}
