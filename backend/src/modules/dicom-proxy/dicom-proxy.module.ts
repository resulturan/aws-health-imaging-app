import { Module } from "@nestjs/common";
import { ImagingSourcesModule } from "../imaging-sources/imaging-sources.module";
import { DicomProxyController } from "./dicom-proxy.controller";
import { DicomProxyService } from "./dicom-proxy.service";

@Module({
    imports: [ImagingSourcesModule],
    controllers: [DicomProxyController],
    providers: [DicomProxyService],
    exports: [DicomProxyService],
})
export class DicomProxyModule {}
