import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDocument } from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel('users')
    private userModel: Model<UserDocument>,
  ) {}
  async updateBusinessName(artistId: string, buinessName: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist.businessName = buinessName;
    await artist.save();

    return artist;
  }
}
