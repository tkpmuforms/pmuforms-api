import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UrlDocument = HydratedDocument<Url>;

@Schema({ timestamps: true })
export class Url {
  @Prop()
  error: string;

  @Prop()
  shortUrl: string;
}

export const UrlSchema = SchemaFactory.createForClass(Url);
