import { Test, TestingModule } from '@nestjs/testing';
import { FilledFormsService } from './filled-forms.service';

describe('FilledFormsService', () => {
  let service: FilledFormsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilledFormsService],
    }).compile();

    service = module.get<FilledFormsService>(FilledFormsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
