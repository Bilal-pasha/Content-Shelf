import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty({
    example: 'instagram',
    enum: ['instagram', 'facebook', 'twitter', 'tiktok', 'other'],
  })
  source: string;

  @ApiPropertyOptional({ nullable: true })
  title: string | null;

  @ApiPropertyOptional({ nullable: true })
  category: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Folder this link is filed under',
  })
  folderId: string | null;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty()
  createdAt: string;
}
