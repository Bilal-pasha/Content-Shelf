import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from './folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { defaultsForFolder } from './folder-defaults';

export interface FolderWithCount {
  id: string;
  name: string;
  icon: string;
  color: string;
  linkCount: number;
  createdAt: Date;
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async list(userId: string): Promise<FolderWithCount[]> {
    const rows = await this.folderRepository
      .createQueryBuilder('f')
      .leftJoin('links', 'l', 'l.folder_id = f.id')
      .where('f.user_id = :userId', { userId })
      .select('f.id', 'id')
      .addSelect('f.name', 'name')
      .addSelect('f.icon', 'icon')
      .addSelect('f.color', 'color')
      .addSelect('f.created_at', 'createdAt')
      .addSelect('COUNT(l.id)', 'linkCount')
      .groupBy('f.id')
      .orderBy('f.name', 'ASC')
      .getRawMany<{
        id: string;
        name: string;
        icon: string;
        color: string;
        createdAt: Date;
        linkCount: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      createdAt: r.createdAt,
      linkCount: Number(r.linkCount) || 0,
    }));
  }

  async create(userId: string, dto: CreateFolderDto): Promise<Folder> {
    const name = dto.name.trim();
    const existing = await this.findByName(userId, name);
    if (existing) {
      throw new ConflictException('A folder with that name already exists');
    }
    const fallback = defaultsForFolder(name);
    const folder = this.folderRepository.create({
      userId,
      name,
      icon: dto.icon ?? fallback.icon,
      color: dto.color ?? fallback.color,
    });
    return this.folderRepository.save(folder);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFolderDto,
  ): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id, userId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.findByName(userId, name);
      if (clash && clash.id !== id) {
        throw new ConflictException('A folder with that name already exists');
      }
      folder.name = name;
    }
    if (dto.icon !== undefined) folder.icon = dto.icon;
    if (dto.color !== undefined) folder.color = dto.color;

    return this.folderRepository.save(folder);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.folderRepository.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Folder not found');
    // links.folder_id is ON DELETE SET NULL — filed links become unfiled.
  }

  async findByName(userId: string, name: string): Promise<Folder | null> {
    return this.folderRepository
      .createQueryBuilder('f')
      .where('f.user_id = :userId', { userId })
      .andWhere('LOWER(f.name) = LOWER(:name)', { name: name.trim() })
      .getOne();
  }

  async exists(userId: string, id: string): Promise<boolean> {
    return this.folderRepository.exists({ where: { id, userId } });
  }

  /**
   * Resolve a folder by name for the share flow: return the id of the
   * existing case-insensitive match, or create one on the fly with
   * category-derived icon/color. Never throws on a duplicate.
   */
  async findOrCreate(
    userId: string,
    name: string,
    category?: string | null,
  ): Promise<string> {
    const trimmed = name.trim();
    const existing = await this.findByName(userId, trimmed);
    if (existing) return existing.id;

    const { icon, color } = defaultsForFolder(trimmed, category);
    const folder = this.folderRepository.create({
      userId,
      name: trimmed,
      icon,
      color,
    });
    const saved = await this.folderRepository.save(folder);
    return saved.id;
  }
}
