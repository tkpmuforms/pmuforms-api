import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FormTemplateDocument = HydratedDocument<FormTemplate>;

@Schema()
export class SectionData {
  @Prop()
  id: string;

  @Prop()
  line: string;

  @Prop()
  title: string;

  @Prop()
  type: string;

  @Prop()
  required?: boolean;
}

@Schema()
export class Section {
  @Prop()
  data: SectionData[];

  @Prop()
  title: string;

  @Prop()
  isClientInformation?: boolean;

  @Prop()
  skip?: boolean;
}

const SectionSchema = SchemaFactory.createForClass(Section);

@Schema({ timestamps: true })
export class FormTemplate {
  @Prop()
  id: string;

  @Prop()
  artistId: string;

  @Prop()
  order: number;

  @Prop()
  parentFormTemplateId: string;

  @Prop()
  rootFormTemplateId: string;

  @Prop({ type: [SectionSchema] })
  sections: Section[]; //

  @Prop()
  services: number[]; //

  @Prop()
  tags: string[];

  @Prop()
  title: string;

  @Prop()
  type: string;

  @Prop()
  usesServicesArrayVersioning: boolean;

  @Prop()
  versionNumber: number;
}

export const FormTemplateSchema = SchemaFactory.createForClass(FormTemplate);

FormTemplateSchema.virtual('serviceDetails', {
  ref: 'services',
  localField: 'services',
  foreignField: 'id',
  justOne: false,
});
