import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ example: 'Cooking' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'chef-hat', description: 'lucide icon key' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  icon?: string;

  @ApiPropertyOptional({ example: '#F97316', description: 'Hex color' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a #RRGGBB hex string',
  })
  color?: string;
}
