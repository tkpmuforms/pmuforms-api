import { Test, TestingModule } from '@nestjs/testing';
import { FilledFormsController } from './filled-forms.controller';

describe('FilledFormsController', () => {
  let controller: FilledFormsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilledFormsController],
    }).compile();

    controller = module.get<FilledFormsController>(FilledFormsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
