import { IsString, IsNotEmpty } from 'class-validator';

export class GrantAccessDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
