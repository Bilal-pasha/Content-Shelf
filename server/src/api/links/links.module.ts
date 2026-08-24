import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  controllers: [LinksController],
  providers: [LinksService, EmbeddingService],
  exports: [LinksService, EmbeddingService],
})
export class LinksModule {}
