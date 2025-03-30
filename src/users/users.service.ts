import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDocument } from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UrlService } from 'src/url/url.service';
import { AppConfigService } from 'src/config/config.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    private urlService: UrlService,
    private config: AppConfigService,
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

  async getAnArtist(artistId: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    return artist;
  }

  async getArtistShortUrl(artistId: string) {
    const DOMAIN = this.config.get('CLIENT_BASE_URL');
    // https://pmu-beauty-forms.web.app/#/06AKKV3fOSTWwvmiAX5bMbnJ9Mj1
    const url = `${DOMAIN}/#/${artistId}`;
    const { shortUrl, longUrl } = await this.urlService.generateShortUrl(url);

    return { shortUrl, longUrl };
  }

  async updateFcmToken(artistId: string, fcmToken: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist.fcmToken = fcmToken;
    await artist.save();

    return artist;
  }
}
