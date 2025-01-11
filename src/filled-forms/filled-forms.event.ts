import { AppointmentDocument, FormTemplateDocument } from 'src/database/schema';

type FilledFormSubmittedEventPayload = {
  appointment: AppointmentDocument;
  formTemplate: FormTemplateDocument;
};

export class FilledFormSubmittedEvent {
  declare payload: FilledFormSubmittedEventPayload;
  constructor(payload: FilledFormSubmittedEventPayload) {
    this.payload = payload;
  }
}
