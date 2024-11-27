import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop()
  email: string;

  @Prop()
  rating: string;

  @Prop()
  review: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
