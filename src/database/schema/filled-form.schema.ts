import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { FilledFormStatus } from 'src/enums';

export type FilledFormDocument = mongoose.HydratedDocument<FilledForm>;

@Schema()
export class FilledForm {
  @Prop({ type: mongoose.Schema.Types.Mixed })
  data: any;

  @Prop()
  appointmentId: string;

  @Prop()
  title: string;

  @Prop({
    type: String,
    enum: Object.values(FilledFormStatus),
    default: FilledFormStatus.INCOMPLETE,
  })
  status: FilledFormStatus;

  @Prop()
  clientId: string;

  @Prop()
  formTemplateId: string;
}

export const FilledFormSchema = SchemaFactory.createForClass(FilledForm);
