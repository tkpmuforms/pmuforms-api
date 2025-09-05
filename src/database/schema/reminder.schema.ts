import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ReminderType } from 'src/enums';

export type ReminderDocument = HydratedDocument<Reminder>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Reminder {
  @Prop({ unique: true })
  id: string;

  @Prop({})
  customerId: string;

  @Prop()
  artistId: string;

  @Prop({ required: true })
  sendAt: Date; // When to send reminder

  @Prop()
  note: string;

  @Prop({ enum: Object.values(ReminderType), required: true })
  type: ReminderType;

  @Prop({ default: false })
  sent: boolean;

  @Prop({})
  sentAt: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
