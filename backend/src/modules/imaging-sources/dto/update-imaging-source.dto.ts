import { IsString, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class AwsCredentialsDto {
  @IsString()
  @IsOptional()
  accessKeyId?: string;

  @IsString()
  @IsOptional()
  secretAccessKey?: string;

  @IsString()
  @IsOptional()
  sessionToken?: string;
}

export class UpdateImagingSourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  datastoreId?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @ValidateNested()
  @Type(() => AwsCredentialsDto)
  @IsOptional()
  credentials?: AwsCredentialsDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
