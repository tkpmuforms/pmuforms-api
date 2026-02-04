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
import {
  SearchMyArtistsQueryParamsDto,
  UpdateBusinessInfoDto,
  UpdateProfileDto,
} from './dto';
import { DateTime } from 'luxon';
import { FilledFormStatus } from 'src/enums';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DeleteArtistEvent } from './users.events';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private logger = new Logger(UsersService.name);
  constructor(
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('form-templates')
    private formTemplateModel: Model<AppointmentDocument>,
    private urlService: UrlService,
    private config: AppConfigService,
    private utilsService: UtilsService,
    private firebaseService: FirebaseService,
    private eventEmitter: EventEmitter2,
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

  async updateBusinessInfo(artistId: string, dto: UpdateBusinessInfoDto) {
    let artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist = await this.userModel.findByIdAndUpdate(
      artist._id,
      {
        $set: {
          businessName: dto.businessName,
          businessUri: await this.utilsService.generateBusinessUri(
            dto.businessName,
            artist.userId,
          ),
          businessPhoneNumber: dto.businessPhoneNumber,
          businessAddress: dto.businessAddress,
          website: dto.website ?? null,
        },
      },
      { new: true },
    );

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
    params: SearchMyArtistsQueryParamsDto,
  ) {
    const { page = 1, limit = 10, name } = params;

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (name) {
      filter.businessName = {
        $regex: name,
        $options: 'i', // case-insensitive
      };
      filter.$or = [
        { appStorePurchaseActive: true },
        { canSendPromotionEmails: true },
      ];
    }

    // Get total count
    const total = await this.userModel.countDocuments(filter);

    // Get paginated users
    const users = await this.userModel
      .find(filter)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const metadata = paginationMetaGenerator(total, page, limit);

    return {
      metadata,
      artists: users,
    };
  }

  async getArtistMetrics(artistId: string) {
    const twelveAm = DateTime.now().startOf('day').toJSDate();
    const eleven59pm = DateTime.now().endOf('day').toJSDate();
    const totalClientsPromise = this.relationshipModel
    .aggregate([
      { $match: { artistId } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: 'id',
          as: 'customer',
        },
      },
      { $match: { customer: { $ne: [] } } }, // only count relationships with an existing customer
      {
        $group: {
          _id: '$customerId', // de-dupe in case of duplicate relationships
        },
      },
      { $count: 'count' },
    ])
    .then((res) => res[0]?.count ?? 0);

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
          'appointment.artistId': artistId,
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

  async deleteArtist(artistId: string) {
    this.eventEmitter.emit('user.delete', new DeleteArtistEvent({ artistId }));
    return { message: 'success' };
  }

  @OnEvent('user.delete', { async: true })
  async deleteArtistEventHandler({ payload }: DeleteArtistEvent) {
    console.log({ payload });
    const artist = await this.userModel.findOne({ userId: payload.artistId });

    if (!artist) {
      return;
    }

    // Delete all their user record, relationships, custom form templates, appointments, filled forms
    // All s3 bucket data relating to their customer
    // Firebase record

    await this.filledFormModel.deleteMany({ artistId: payload.artistId });
    await this.formTemplateModel.deleteMany({ artistId: payload.artistId });
    await this.appointmentModel.deleteMany({ artistId: payload.artistId });
    await this.relationshipModel.deleteMany({ artistId: payload.artistId });
    await this.userModel.deleteOne({ userId: payload.artistId });
    await this.deleteArtistFirebaseAuth(payload.artistId);
    await this.deleteFilesFromFirebaseStorage(payload.artistId);
  }

  private async deleteArtistFirebaseAuth(artistId: string) {
    try {
      await this.firebaseService.deleteUser(artistId);
    } catch (error) {
      this.logger.log(`XXX unable to delete firebase auth for-${artistId} XXX`);
      this.logger.error(error);
    }
  }

  private async deleteFilesFromFirebaseStorage(artistId: string) {
    const files = [`signatures/artist/${artistId}/signature.jpg`];

    for (const file of files) {
      try {
        await this.firebaseService.deleteFileFromBucket(file);
      } catch (error) {
        this.logger.log(`XXX unable to delete file- ${file} XXX`);
        this.logger.error(error);
      }
    }
  }

  async updateProfile(artistId: string, dto: UpdateProfileDto) {
    const artist = await this.userModel
      .findOne({ userId: artistId })
      .select('+profile');

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    artist.set({
      profile: {
        firstName: dto.firstName ?? artist.profile?.firstName,
        lastName: dto.lastName ?? artist.profile?.lastName,
        phoneNumber: dto.phoneNumber ?? artist.profile?.phoneNumber,
        avatarUrl: !!dto.removeAvatar
          ? undefined
          : (dto.avatarUrl ?? artist.profile?.avatarUrl),
      },
    });

    await artist.save();

    return artist.profile;
  }

  async getArtistProfile(artistId: string) {
    const artist = await this.userModel
      .findOne({ userId: artistId })
      .select('+profile');

    if (!artist) {
      throw new NotFoundException(`artist with id ${artistId} not found`);
    }

    return artist.profile || {};
  }
}
