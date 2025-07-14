type DeleteArtistEventPayload = {
  artistId: string;
};

export class DeleteArtistEvent {
  declare payload: DeleteArtistEventPayload;
  constructor(payload: DeleteArtistEventPayload) {
    this.payload = payload;
  }
}
