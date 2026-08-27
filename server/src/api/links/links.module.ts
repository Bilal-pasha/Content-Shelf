import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { EmbeddingService } from './embedding.service';
import { CategorizationService } from './categorization.service';
import { QueryGenerationService } from './query-generation.service';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [TypeOrmModule.forFeature([Link]), FoldersModule],
  controllers: [LinksController],
  providers: [
    LinksService,
    EmbeddingService,
    CategorizationService,
    QueryGenerationService,
  ],
  exports: [LinksService, EmbeddingService],
})
export class LinksModule {}
