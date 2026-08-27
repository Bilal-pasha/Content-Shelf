import {
  IsString,
  IsUrl,
  IsOptional,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPublicUrl } from '../../../common/security/is-public-url.validator';

const SOURCES = [
  'instagram',
  'facebook',
  'twitter',
  'tiktok',
  'youtube',
  'linkedin',
  'other',
] as const;
const CATEGORIES = [
  'nature',
  'cooking',
  'food',
  'sports',
  'music',
  'tech',
  'entertainment',
  'other',
] as const;

export class CreateLinkDto {
  @ApiProperty({
    example: 'https://www.instagram.com/p/ABC123/',
    description: 'Shared social platform URL',
  })
  @IsString()
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @MaxLength(2048)
  @IsPublicUrl()
  url: string;

  @ApiPropertyOptional({
    example: 'instagram',
    enum: SOURCES,
    description: 'Platform the link came from',
  })
  @IsOptional()
  @IsString()
  @IsIn(SOURCES, { message: `source must be one of: ${SOURCES.join(', ')}` })
  source?: (typeof SOURCES)[number];

  @ApiPropertyOptional({
    example: 'My favorite reel',
    description: 'Optional title for the saved link',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    example: 'nature',
    enum: CATEGORIES,
    description: 'Video/content category',
  })
  @IsOptional()
  @IsString()
  @IsIn(CATEGORIES, {
    message: `category must be one of: ${CATEGORIES.join(', ')}`,
  })
  category?: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({
    example: 'https://example.com/thumb.jpg',
    description: 'Thumbnail image URL (fallback: fetched from page metadata)',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'thumbnailUrl must be a valid URL' })
  @MaxLength(2048)
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Existing folder to file this link under',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    example: 'Cooking',
    description:
      'Folder name to file under — matched case-insensitively, created if missing. Ignored when folderId is set.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  folderName?: string;
}
