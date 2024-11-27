import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type FilledFormDocument = mongoose.HydratedDocument<FilledForm>;

@Schema()
export class FilledForm {
  @Prop({ type: mongoose.Schema.Types.Mixed })
  data: any;
}

export const FilledFormSchema = SchemaFactory.createForClass(FilledForm);
