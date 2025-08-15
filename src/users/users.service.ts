import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentDocument,
  FilledFormDocument,
  RelationshipDocument,
  UserDocument,
} from 'src/database/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { UrlService } from 'src/url/url.service';
import { AppConfigService } from 'src/config/config.service';
import { UtilsService } from 'src/utils/utils.service';
import { paginationMetaGenerator } from 'src/utils';
import { SearchMyArtistsQueryParamsDto } from './dto';
import { DateTime } from 'luxon';
import { FilledFormStatus } from 'src/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
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
    artist.businessUri = await this.utilsService.generateBusinessUri(
      buinessName,
      artistId,
    );
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

    const url = `${DOMAIN}/${businessUri}`;
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

  async searchArtistByName(
    customerId: string,
    params: SearchMyArtistsQueryParamsDto,
  ) {
    const { page = 1, limit = 10, name } = params;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          customerId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artistId',
          foreignField: 'userId',
          as: 'artist',
        },
      },
      {
        $unwind: {
          path: '$artist',
          includeArrayIndex: '0',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: skip,
            },
            {
              $limit: Number(limit),
            },
            {
              $replaceRoot: {
                newRoot: '$artist',
              },
            },
          ],
          aggregation: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    if (name) {
      pipeline.splice(3, 0, {
        $match: {
          'artist.businessName': { $regex: name, $options: 'i' },
        },
      });
    }

    const result = await this.relationshipModel.aggregate(pipeline);

    const docCount = result[0].aggregation[0]?.count || 0;
    const artists: UserDocument[] = result[0].data;
    const metadata = paginationMetaGenerator(docCount, page, limit);

    return { metadata, artists };
  }

  async getArtistMetrics(artistId: string) {
    const twelveAm = DateTime.now().startOf('day').toJSDate();
    const eleven59pm = DateTime.now().endOf('day').toJSDate();
    const totalClientsPromise = this.relationshipModel.countDocuments({
      artistId,
    });

    const filledFormsPipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: 'id',
          as: 'appointment',
        },
      },
      {
        $unwind: {
          path: '$appointment',
          includeArrayIndex: '0',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'appointment.artistId': 'yp26mrvalfWtAjebQdlkmIIg5Rg2',
        },
      },
      {
        $project: {
          id: 1,
          status: 1,
          appointmentId: 1,
          appointment: 1,
        },
      },
      {
        $facet: {
          allFilledForms: [
            {
              $count: 'count',
            },
          ],
          pendingFilledForms: [
            {
              $match: {
                status: FilledFormStatus.INCOMPLETE,
              },
            },
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    const filledFormsPromise =
      this.filledFormModel.aggregate(filledFormsPipeline);

    const todaysSchedulePromise = this.appointmentModel.countDocuments({
      artistId,
      date: {
        $gte: twelveAm,
        $lte: eleven59pm,
      },
    });

    const [totalClients, pendingSubmissionsAgg, todaysSchedule] =
      await Promise.all([
        totalClientsPromise,
        filledFormsPromise,
        todaysSchedulePromise,
      ]);
    const pendingSubmissions =
      pendingSubmissionsAgg?.[0]?.pendingFilledForms?.[0]?.count || 0;
    const formsShared =
      pendingSubmissionsAgg?.[0]?.allFilledForms?.[0]?.count || 0;

    return { totalClients, formsShared, pendingSubmissions, todaysSchedule };
  }
}
