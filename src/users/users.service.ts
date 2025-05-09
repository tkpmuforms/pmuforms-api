import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDocument } from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UrlService } from 'src/url/url.service';
import { AppConfigService } from 'src/config/config.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    private urlService: UrlService,
    private config: AppConfigService,
    private utilsService: UtilsService,
  ) {}

  async updateBusinessName(artistId: string, buinessName: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist.businessName = buinessName;
    artist.businessUri =
      await this.utilsService.generateBusinessUri(buinessName);
    await artist.save();

    return artist;
  }

  async getAnArtistById(artistId: string) {
    // find by artistId or businessUri

    const artist = await this.userModel.findOne({
      $or: [{ userId: artistId }, { businessUri: artistId }],
    });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    return artist;
  }

  async getArtistShortUrl(artistId: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }
    const { businessUri } = artist;

    if (!businessUri) {
      throw new NotFoundException(
        `artist with id ${artistId} has no business uri`,
      );
    }

    const DOMAIN = this.config.get('CLIENT_BASE_URL');
    // https://www.pmuforms.com/business/[bussiness_name]/clients

    const url = `${DOMAIN}/business/${businessUri}/clients`;
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

  async updateArtistSignatureUrl(artistId: string, url: string) {
    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist.signature_url = url;
    await artist.save();

    return artist;
  }

  async testPushNotification(artist: UserDocument, dto: any) {
    if (!artist.fcmToken) {
      return { message: 'fcm token not found' };
    }
    await this.utilsService.sendPushNotification({
      title: dto.title,
      body: dto.body,
      fcmToken: artist.fcmToken,
    });

    return { message: 'success' };
  }

  async searchArtistByName(name: string) {
    const artists = await this.userModel
      .find({
        businessName: { $regex: name, $options: 'i' },
      })
      .limit(10);

    return artists;
  }
}
