import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ timestamps: true })
export class Service {
  @Prop({ unique: true })
  id: number;

  @Prop()
  service: string;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
