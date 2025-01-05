import { Module } from '@nestjs/common';
import { FilledFormsController } from './filled-forms.controller';
import { FilledFormsService } from './filled-forms.service';

@Module({
  controllers: [FilledFormsController],
  providers: [FilledFormsService]
})
export class FilledFormsModule {}
