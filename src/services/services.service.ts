import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from 'src/database/schema';
import { ServiceDocument } from 'src/database/schema/service.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel('services')
    private serviceModel: Model<ServiceDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
  ) {}

  async getAllServices() {
    const services = await this.serviceModel.find().sort({ service: 'asc' });
    return services;
  }

  async getArtistServices(artistId: string) {
    const artist = await this.userModel.findOne({ userId: artistId });
    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }
    return artist.services ?? [];
  }

  async updateArtistServices(artistId: string, services: number[]) {
    // check if services exist
    const newServices: Pick<ServiceDocument, 'id' | 'service'>[] = [];
    for (const serviceId of services) {
      const service = await this.serviceModel.findOne({ id: serviceId });
      if (!service) {
        throw new NotFoundException(`service with id ${serviceId} not found`);
      }
      newServices.push({ id: service.id, service: service.service });
    }

    const artist = await this.userModel.findOneAndUpdate(
      { userId: artistId },
      { services: newServices },
      { new: true },
    );

    return artist;
  }
}
