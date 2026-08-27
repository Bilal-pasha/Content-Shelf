import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { FoldersService, FolderWithCount } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { Folder } from './folder.entity';

@ApiTags('folders')
@Controller('api/folders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's folders with link counts" })
  @ApiResponse({ status: 200, description: 'List of folders' })
  async findAll(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string; data: FolderResponseDto[] }> {
    const folders = await this.foldersService.list(user.id);
    return {
      success: true,
      message: 'Folders retrieved successfully',
      data: folders.map((f) => this.countToDto(f)),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  @ApiResponse({ status: 409, description: 'Duplicate folder name' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateFolderDto,
  ): Promise<{ success: boolean; message: string; data: FolderResponseDto }> {
    const folder = await this.foldersService.create(user.id, dto);
    return {
      success: true,
      message: 'Folder created successfully',
      data: this.toDto(folder),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename or restyle a folder' })
  @ApiResponse({ status: 200, description: 'Folder updated' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ): Promise<{ success: boolean; message: string; data: FolderResponseDto }> {
    const folder = await this.foldersService.update(user.id, id, dto);
    return {
      success: true,
      message: 'Folder updated successfully',
      data: this.toDto(folder),
    };
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete a folder (its links become unfiled, not deleted)',
  })
  @ApiResponse({ status: 200, description: 'Folder deleted' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.foldersService.remove(user.id, id);
    return { success: true, message: 'Folder deleted successfully' };
  }

  private toDto(folder: Folder, linkCount = 0): FolderResponseDto {
    return {
      id: folder.id,
      name: folder.name,
      icon: folder.icon,
      color: folder.color,
      linkCount,
      createdAt: folder.createdAt.toISOString(),
    };
  }

  private countToDto(f: FolderWithCount): FolderResponseDto {
    return {
      id: f.id,
      name: f.name,
      icon: f.icon,
      color: f.color,
      linkCount: f.linkCount,
      createdAt: f.createdAt.toISOString(),
    };
  }
}
