import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  BadRequestException,
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
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import type { LinkSource } from './link.entity';
import { Link } from './link.entity';

@ApiTags('links')
@Controller('api/links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Save a shared link' })
  @ApiResponse({ status: 201, description: 'Link saved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateLinkDto,
  ): Promise<{ success: boolean; message: string; data: LinkResponseDto }> {
    const link = await this.linksService.create(user.id, dto);
    return {
      success: true,
      message: 'Link saved successfully',
      data: this.toDto(link),
    };
  }

  @Get('search')
  @ApiOperation({
    summary:
      'Semantic search over saved links (YouTube only in this v1 prototype)',
  })
  @ApiResponse({ status: 200, description: 'Ranked search results' })
  @ApiResponse({ status: 400, description: 'Missing query parameter "q"' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(
    @CurrentUser() user: User,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; message: string; data: LinkResponseDto[] }> {
    if (!q?.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const links = await this.linksService.searchSemantic(
      user.id,
      q,
      limit !== undefined ? Number(limit) : undefined,
    );
    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: links.map((l) => this.toDto(l)),
    };
  }

  @Get()
  @ApiOperation({ summary: "List current user's saved links" })
  @ApiResponse({ status: 200, description: 'List of saved links' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ success: boolean; message: string; data: LinkResponseDto[] }> {
    const links = await this.linksService.findAll(user.id, {
      search,
      source: source as LinkSource | undefined,
      category,
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    });
    return {
      success: true,
      message: 'Links retrieved successfully',
      data: links.map((l) => this.toDto(l)),
    };
  }

  private toDto(link: Link): LinkResponseDto {
    return {
      id: link.id,
      url: link.url,
      source: link.source,
      title: link.title,
      category: link.category,
      thumbnailUrl: link.thumbnailUrl,
      createdAt: link.createdAt.toISOString(),
    };
  }
}
