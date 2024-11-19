import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RelationshipDocument = HydratedDocument<Relationship>;

@Schema()
export class Relationship {
  @Prop()
  artistId: string;

  @Prop()
  customerId: string;
}

export const RelationshipSchema = SchemaFactory.createForClass(Relationship);
