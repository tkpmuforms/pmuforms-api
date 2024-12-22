import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CustomerDocument } from './customer.schema';

export type RelationshipDocument = HydratedDocument<Relationship>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Relationship {
  @Prop()
  artistId: string;

  @Prop()
  customerId: string;

  customer?: CustomerDocument;
}

export const RelationshipSchema = SchemaFactory.createForClass(Relationship);

RelationshipSchema.virtual('customer', {
  ref: 'customers',
  localField: 'customerId',
  foreignField: 'id',
  justOne: true,
});
