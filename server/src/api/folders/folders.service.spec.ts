import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { Folder } from './folder.entity';

describe('FoldersService', () => {
  let service: FoldersService;
  let repo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
    exists: jest.Mock;
  };
  let qb: {
    leftJoin: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    groupBy: jest.Mock;
    orderBy: jest.Mock;
    getRawMany: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    qb = {
      leftJoin: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      select: jest.fn(() => qb),
      addSelect: jest.fn(() => qb),
      groupBy: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      getRawMany: jest.fn(() => Promise.resolve([])),
      getOne: jest.fn(() => Promise.resolve(null)),
    };
    repo = {
      createQueryBuilder: jest.fn(() => qb),
      create: jest.fn((v: Partial<Folder>) => v),
      save: jest.fn((v: Partial<Folder>) =>
        Promise.resolve({ id: 'new-folder', ...v }),
      ),
      findOne: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: getRepositoryToken(Folder), useValue: repo },
      ],
    }).compile();

    service = module.get(FoldersService);
  });

  describe('list', () => {
    it('maps raw link counts to numbers', async () => {
      qb.getRawMany.mockResolvedValue([
        {
          id: 'f1',
          name: 'Cooking',
          icon: 'chef-hat',
          color: '#F97316',
          createdAt: new Date(),
          linkCount: '3',
        },
      ]);

      const result = await service.list('user-1');

      expect(result[0].linkCount).toBe(3);
      expect(typeof result[0].linkCount).toBe('number');
    });
  });

  describe('create', () => {
    it('rejects a duplicate name (case-insensitive)', async () => {
      qb.getOne.mockResolvedValue({
        id: 'existing',
        name: 'cooking',
      } as Folder);

      await expect(
        service.create('user-1', { name: 'Cooking' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('derives icon and color from the name when not supplied', async () => {
      qb.getOne.mockResolvedValue(null);

      await service.create('user-1', { name: 'Gym Workouts' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'dumbbell', color: '#3B82F6' }),
      );
    });
  });

  describe('findOrCreate', () => {
    it('returns the existing folder id without creating', async () => {
      qb.getOne.mockResolvedValue({ id: 'existing-id' } as Folder);

      const id = await service.findOrCreate('user-1', 'Cooking');

      expect(id).toBe('existing-id');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates with category-derived styling when there is no match', async () => {
      qb.getOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({ id: 'created-id' });

      const id = await service.findOrCreate('user-1', 'Cooking', 'cooking');

      expect(id).toBe('created-id');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ icon: 'chef-hat', color: '#F97316' }),
      );
    });
  });

  describe('remove', () => {
    it('throws when nothing was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
