import { Module } from '@nestjs/common';
import { FilledFormsController } from './filled-forms.controller';
import { FilledFormsService } from './filled-forms.service';
import { FormsService } from 'src/forms/forms.service';

@Module({
  controllers: [FilledFormsController],
  providers: [FilledFormsService, FormsService],
})
export class FilledFormsModule {}
