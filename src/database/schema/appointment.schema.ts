import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ timestamps: true })
export class Appointment {
  @Prop()
  id: string;

  @Prop()
  allFormsCompleted: boolean;

  @Prop()
  customerId: string;

  @Prop()
  artistId: string;

  @Prop({ type: Date })
  date: Date;

  @Prop()
  services: number[];

  @Prop()
  signature_url: string;

  @Prop()
  signed: boolean;

  @Prop()
  deleted: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
