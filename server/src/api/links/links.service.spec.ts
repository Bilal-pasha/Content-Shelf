import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LinksService } from './links.service';
import { Link } from './link.entity';
import { EmbeddingService } from './embedding.service';
import { CategorizationService } from './categorization.service';
import { QueryGenerationService } from './query-generation.service';
import { FoldersService } from '../folders/folders.service';

type QueryBuilderMock = {
  where: jest.Mock;
  andWhere: jest.Mock;
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  setParameter: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  limit: jest.Mock;
  getMany: jest.Mock<Promise<Link[]>, []>;
};

function makeQueryBuilderMock(result: Link[] = []): QueryBuilderMock {
  const qb: Partial<QueryBuilderMock> = {};
  qb.where = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.innerJoin = jest.fn(() => qb);
  qb.leftJoin = jest.fn(() => qb);
  qb.groupBy = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.setParameter = jest.fn(() => qb);
  qb.skip = jest.fn(() => qb);
  qb.take = jest.fn(() => qb);
  qb.limit = jest.fn(() => qb);
  qb.getMany = jest.fn(() => Promise.resolve(result));
  return qb as QueryBuilderMock;
}

describe('LinksService', () => {
  let service: LinksService;
  let repo: { createQueryBuilder: jest.Mock; query: jest.Mock };
  let embeddingService: { embed: jest.Mock; embedBatch: jest.Mock };
  let qbMock: QueryBuilderMock;

  beforeEach(async () => {
    qbMock = makeQueryBuilderMock([]);
    repo = {
      createQueryBuilder: jest.fn(() => qbMock),
      query: jest.fn(() => Promise.resolve()),
    };
    embeddingService = {
      embed: jest.fn(),
      embedBatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: getRepositoryToken(Link), useValue: repo },
        { provide: EmbeddingService, useValue: embeddingService },
        {
          provide: CategorizationService,
          useValue: { categorize: jest.fn(() => Promise.resolve(null)) },
        },
        {
          provide: QueryGenerationService,
          useValue: { generate: jest.fn(() => Promise.resolve([])) },
        },
        {
          provide: FoldersService,
          useValue: {
            exists: jest.fn(() => Promise.resolve(false)),
            findOrCreate: jest.fn(() => Promise.resolve('folder-1')),
            findByName: jest.fn(() => Promise.resolve(null)),
          },
        },
      ],
    }).compile();

    service = module.get(LinksService);
  });

  describe('searchSemantic', () => {
    it('falls back to the ILIKE findAll path when embedding fails', async () => {
      embeddingService.embed.mockResolvedValue(null);
      const fallbackResult = [{ id: 'link-1' } as Link];
      const findAllSpy = jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(fallbackResult);

      const result = await service.searchSemantic('user-1', 'react native');

      expect(embeddingService.embed).toHaveBeenCalledWith('react native', {
        isQuery: true,
      });
      expect(findAllSpy).toHaveBeenCalledWith('user-1', {
        search: 'react native',
        limit: 20,
      });
      expect(result).toBe(fallbackResult);
      // Vector similarity path must not run when the embed call failed.
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('runs the multi-vector distance query when embedding succeeds', async () => {
      embeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3]);
      const vectorResult = [{ id: 'link-2' } as Link];
      qbMock.getMany.mockResolvedValue(vectorResult);

      const result = await service.searchSemantic('user-1', 'react native');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('link');
      expect(qbMock.innerJoin).toHaveBeenCalledWith(
        'link_search_vectors',
        'v',
        'v.link_id = link.id',
      );
      expect(qbMock.groupBy).toHaveBeenCalledWith('link.id');
      expect(result).toBe(vectorResult);
    });
  });
});
