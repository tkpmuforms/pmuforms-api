import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDocument } from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UrlService } from 'src/url/url.service';
import { AppConfigService } from 'src/config/config.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    private urlService: UrlService,
    private config: AppConfigService,
    private firebaseService: FirebaseService,
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
    const url = `${DOMAIN}/#/${artistId}`;
    const { shortUrl, longUrl } = await this.urlService.generateShortUrl(
      url,
      artistId,
    );

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
    await this.firebaseService.sendPushNotification({
      title: dto.title,
      body: dto.body,
      fcmToken: artist.fcmToken,
    });

    return { message: 'success' };
  }
}
