import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

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
}

const InfoSchema = SchemaFactory.createForClass(Info);

@Schema()
export class Note {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  note: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

@Schema({ timestamps: true })
export class User {
  @Prop()
  id: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ type: InfoSchema }) // Embedding the subschema
  info: Info;

  @Prop()
  name: string;

  @Prop({ type: [NoteSchema] })
  notes: Note[];
}

export const UserSchema = SchemaFactory.createForClass(User);
