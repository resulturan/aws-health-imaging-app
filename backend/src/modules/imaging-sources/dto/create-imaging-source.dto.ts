import { IsString, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class AwsCredentialsDto {
  @IsString()
  @IsNotEmpty()
  accessKeyId: string;

  @IsString()
  @IsNotEmpty()
  secretAccessKey: string;

  @IsString()
  @IsOptional()
  sessionToken?: string;
}

export class CreateImagingSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  datastoreId: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @ValidateNested()
  @Type(() => AwsCredentialsDto)
  credentials: AwsCredentialsDto;
}
