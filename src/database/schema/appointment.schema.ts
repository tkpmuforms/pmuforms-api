import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CustomerDocument } from './customer.schema';
import { UserDocument } from './user.schema';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Appointment {
  @Prop()
  id: string;

  @Prop({ default: false })
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

  @Prop({ default: false })
  signed: boolean;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  formsToFillCount: number;

  serviceDetails: { id: number; service: string }[];

  artist: UserDocument;

  customer: CustomerDocument;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.virtual('filledForms', {
  ref: 'filled-forms',
  localField: 'id',
  foreignField: 'appointmentId',
  justOne: false,
});

AppointmentSchema.virtual('serviceDetails', {
  ref: 'services',
  localField: 'services',
  foreignField: 'id',
  justOne: false,
});

AppointmentSchema.virtual('customer', {
  ref: 'customers',
  localField: 'customerId',
  foreignField: 'id',
  justOne: true,
});

AppointmentSchema.virtual('artist', {
  ref: 'users',
  localField: 'artistId',
  foreignField: 'userId',
  justOne: true,
});
