import { Injectable } from "@nestjs/common";
import * as archiver from "archiver";
import { DicomProxyService } from "../dicom-proxy/dicom-proxy.service";
import { Readable } from "stream";

@Injectable()
export class ExportService {
    constructor(private readonly dicomProxyService: DicomProxyService) {}

    async exportStudy(
        sourceId: string,
        imageSetId: string,
        userId: string,
        userRole: string
    ): Promise<Readable> {
        try {
            // Get study metadata
            const metadata: any = await this.dicomProxyService.getMetadata(
                sourceId,
                imageSetId,
                userId,
                userRole
            );

            // Extract all frame IDs
            const frameIds = this.extractFrameIds(metadata?.metadata);

            // Create archive stream
            const archive = archiver("zip", {
                zlib: { level: 9 }, // Maximum compression
            });

            // Add each frame to the archive
            for (let i = 0; i < frameIds.length; i++) {
                const frameId = frameIds[i];
                try {
                    const frameData =
                        await this.dicomProxyService.getImageFrame(
                            sourceId,
                            imageSetId,
                            frameId,
                            userId,
                            userRole
                        );

                    // Add frame to archive with sequential naming
                    const fileName = `frame_${String(i + 1).padStart(4, "0")}_${frameId}.dcm`;
                    archive.append(frameData.imageFrameBlob, {
                        name: fileName,
                    });
                } catch (error) {
                    console.error(`Failed to fetch frame ${frameId}:`, error);
                    // Continue with other frames even if one fails
                }
            }

            // Add metadata as JSON
            archive.append(JSON.stringify(metadata?.metadata, null, 2), {
                name: "metadata.json",
            });

            // Finalize the archive
            archive.finalize();

            return archive as unknown as Readable;
        } catch (error) {
            console.error("Failed to export study:", error);
            throw error;
        }
    }

    private extractFrameIds(metadata: any): string[] {
        const frameIds: string[] = [];

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
                                const frames = Array.isArray(
                                    instance.ImageFrames
                                )
                                    ? instance.ImageFrames
                                    : [instance.ImageFrames];

                                for (const frame of frames) {
                                    const frameId =
                                        frame.ID || frame.imageFrameId;
                                    if (frameId) {
                                        frameIds.push(frameId);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error extracting frame IDs:", error);
        }

        return frameIds;
    }
}
