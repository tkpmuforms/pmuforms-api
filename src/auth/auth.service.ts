import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/config.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  CustomerDocument,
  UserDocument,
  RelationshipDocument,
} from 'src/database/schema';
import { UserRole } from 'src/enums';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('users') private userModel: Model<UserDocument>,
    @InjectModel('customers') private customerModel: Model<CustomerDocument>,
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    private jwtService: JwtService,
    private configService: AppConfigService,
    private firebaseService: FirebaseService,
    private util: UtilsService,
  ) {}

  private async signToken(userId: string, role: UserRole, artistId?: string) {
    const payload: { role: UserRole; sub: string; artistId?: string } = {
      role,
      sub: userId,
    };

    if (artistId) {
      payload.artistId = artistId;
    }

    // 90 days for artists and 24hrs for customers
    const duration = role === UserRole.ARTIST ? '90d' : '1d';

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: duration, // 3 months
    });

    return token;
  }

  async createUser(accessToken: string) {
    const auth = await this.firebaseService.verifyIdToken(accessToken);

    const { uid: artistId, email, name, email_verified } = auth;

    if (!email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    let userCreated = false;
    let artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      userCreated = true;
      artist = await this.userModel.create({
        userId: artistId,
        email,
        businessName: name ?? 'New Business',
        businessUri: await this.util.generateBusinessUri(
          name ?? `New Business ${Date.now()}`,
          artistId,
        ),
      });
    }

    if (userCreated) {
      // send welcome email
      this.sendWelcomeEmail(artist.email, artist.businessName);
    }

    const access_token = await this.signToken(artist.userId, UserRole.ARTIST);
    return { access_token, artist };
  }

  async createCustomer(accessToken: string, artistId?: string) {
    const auth = await this.firebaseService.verifyIdToken(accessToken);

    const { uid: customerId, email, name, email_verified } = auth;

    if (!email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    let artist: UserDocument | null = null;

    if (artistId) {
      artist = await this.userModel.findOne({
        $or: [{ userId: artistId }, { businessUri: artistId }],
      });

      if (!artist) {
        throw new UnauthorizedException(
          `Invalid form link, request a new link from your artist.`,
        );
      }
    }

    let customer = await this.customerModel.findOne({ id: customerId });

    if (!customer) {
      customer = await this.customerModel.create({
        id: customerId,
        email,
        name: name,
        info: { client_name: name },
      });
    }

    if (artist) {
      //create relationship
      await this.relationshipModel.findOneAndUpdate(
        { artistId: artist.userId, customerId: customer.id },
        { artistId: artist.userId, customerId: customer.id },
        { upsert: true },
      );
    }

    // check if customer has an artist account
    const customerArtistAccount = await this.userModel.findOne({
      userId: customerId,
    });
    if (customerArtistAccount) {
      customer.artistUri = customerArtistAccount.businessUri;
      await customer.save();
    }

    const access_token = await this.signToken(
      customer.id,
      UserRole.CUSTOMER,
      artist?.userId,
    );

    return { access_token, customer };
  }

  async switchCustomerAuthContext(customerId: string, artistId: string) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new UnauthorizedException(
        `No relationship found between artist ${artistId} and customer ${customerId}`,
      );
    }

    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new UnauthorizedException(`No artist found with id ${artistId}`);
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    const access_token = await this.signToken(
      customer.id,
      UserRole.CUSTOMER,
      artistId,
    );

    return { access_token, customer };
  }

  private async sendEmailVerificationLink(email: string, link: string) {
    const subject = 'Verify your email address for PMUForms';
    const message = `
    <h1>Welcome to PMUForms!</h1>
    <p>To complete your registration, please verify your email address by clicking the link below:</p>
    <p><a href="${link}">Verify Email</a></p>
    <p>If you did not request this, please ignore this email.</p>
    <p>&nbsp;</p>
    <p>The PMUForms Team</p>
  `;

    await this.util.sendEmail({
      to: email,
      subject,
      message,
    });
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async sendEmailVerification(uid: string) {
    const firebaseUser = await this.firebaseService.getUserById(uid);

    if (!firebaseUser) {
      throw new NotFoundException('User not found');
    }

    const { email, emailVerified } = firebaseUser;

    if (emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const link =
      await this.firebaseService.generateEmailVerificationLink(email);

    await this.sendEmailVerificationLink(email, link);

    return { message: 'Email Sent' };
  }

  private async sendWelcomeEmail(email: string, businessName?: string) {
    const businessNameToUse =
      !businessName || businessName === 'New Business' ? '' : businessName;
    const subject = 'Welcome to PMU Forms – Let’s Get You Set Up!';
    const message = `
    <p>Hi <strong>${businessNameToUse}</strong>,</p>
    <p>Thanks for signing up with PMU Forms — we’re excited to have you on board!</p>
    <p>Just checking in to see if you need help getting started or would like a quick walkthrough of the app. We’re here to support you every step of the way.</p>
    <p>To get the most out of your account, here are the next steps:</p>
    <ol>
      <li>Update your business name – this shows up on all your forms.</li>
      <li>Add your signature – it will be auto-applied after a client completes a form.</li>
      <li>Add your services – so you can preview and organize your ready-to-use forms.</li>
      <li>Subscribe – to unlock your personalized form link to share with clients.</li>
    </ol>
    <p>If you’re running into any issues or want a demo, just hit reply — happy to help!</p>
    <p>Warmly,<br/>PMU Forms Team.</p>
  `;

    await this.util.sendEmail({
      to: email,
      subject,
      message,
    });
  }
}
