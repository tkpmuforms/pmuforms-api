import { AppointmentDocument } from 'src/database/schema';

type FilledFormSubmittedEventPayload = {
  appointment: AppointmentDocument;
};

export class FilledFormSubmittedEvent {
  declare payload: FilledFormSubmittedEventPayload;
  constructor(payload: FilledFormSubmittedEventPayload) {
    this.payload = payload;
  }
}
