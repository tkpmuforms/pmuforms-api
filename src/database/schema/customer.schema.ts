import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema()
export class Info {
  @Prop()
  age: number;

  @Prop()
  cell_phone: string;

  @Prop()
  city: string;

  @Prop()
  client_name: string;

  @Prop()
  date_of_birth: string;

  @Prop()
  date_updated: string;

  @Prop()
  emergency_contact_name: string;

  @Prop()
  emergency_contact_phone: string;

  @Prop()
  home_address: string;

  @Prop()
  home_phone: string;

  @Prop()
  occupation: string;

  @Prop()
  referred: string;

  @Prop()
  state: string;

  @Prop()
  zip_code: string;

  @Prop()
  avatar_url: string;
}

const InfoSchema = SchemaFactory.createForClass(Info);

@Schema({ timestamps: true })
export class Note {
  @Prop()
  id: string;

  @Prop()
  date: Date; //might remove and use default timestamps

  @Prop()
  imageUrl?: string;

  @Prop({ required: true })
  note: string;

  @Prop()
  artistId: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

@Schema({ timestamps: true })
export class Customer {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLoggedIn: Date;

  @Prop({ type: InfoSchema }) // Embedding the subschema
  info: Info;

  @Prop({ type: [NoteSchema], default: [] })
  notes: Note[];

  @Prop()
  signature_url: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
