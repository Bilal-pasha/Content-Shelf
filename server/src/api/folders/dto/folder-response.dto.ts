import { ApiProperty } from '@nestjs/swagger';

export class FolderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'chef-hat' })
  icon: string;

  @ApiProperty({ example: '#F97316' })
  color: string;

  @ApiProperty({ description: 'Number of links filed under this folder' })
  linkCount: number;

  @ApiProperty()
  createdAt: string;
}
