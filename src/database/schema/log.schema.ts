import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LogDocument = HydratedDocument<Log>;

@Schema({ timestamps: true })
export class Log {
  @Prop()
  artistId: string;

  @Prop()
  businessName: string;

  @Prop()
  error: string;

  @Prop()
  log: string;

  @Prop({ type: Date })
  time: Date;

  @Prop()
  userEmail: string;

  @Prop()
  userId: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);
