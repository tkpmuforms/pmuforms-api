import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { FilledFormStatus } from 'src/enums';

export type FilledFormDocument = mongoose.HydratedDocument<FilledForm>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
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

  @Prop({ default: false })
  isSkipped: boolean;
}

export const FilledFormSchema = SchemaFactory.createForClass(FilledForm);

FilledFormSchema.virtual('formTemplate', {
  ref: 'form-templates',
  localField: 'formTemplateId',
  foreignField: 'id',
  justOne: true,
});
