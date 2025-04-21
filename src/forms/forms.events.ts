type FormTemplateDeletedEventPayload = {
  artistId: string;
};

export class FormTemplateDeletedEvent {
  declare payload: FormTemplateDeletedEventPayload;
  constructor(payload: FormTemplateDeletedEventPayload) {
    this.payload = payload;
  }
}
