import {
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
  ) {}

  private async signToken(userId: string, role: UserRole) {
    const payload = { role, sub: userId };

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

    const artist = await this.userModel.findOneAndUpdate(
      {
        userId: artistId,
      },
      { userId: artistId, email, businessName: name ?? 'New Business' },
      { upsert: true, new: true },
    );

    const access_token = await this.signToken(artist.userId, UserRole.ARTIST);
    return { access_token, artist };
  }

  async createCustomer(accessToken: string, artistId: string) {
    const auth = await this.firebaseService.verifyIdToken(accessToken);

    const { uid: customerId, email, name, email_verified } = auth;

    if (!email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    const artist = await this.userModel.findOne({ userId: artistId });

    if (!artist) {
      throw new UnauthorizedException(`No artist found with id ${artistId}`);
    }

    const customer = await this.customerModel.findOneAndUpdate(
      {
        id: customerId,
      },
      { id: customerId, email, info: { client_name: name ?? 'New Customer' } },
      { upsert: true, new: true },
    );

    //create relationship
    await this.relationshipModel.findOneAndUpdate(
      { artistId: artist.userId, customerId: customer.id },
      { artistId: artist.userId, customerId: customer.id },
      { upsert: true },
    );

    const access_token = await this.signToken(customer.id, UserRole.CUSTOMER);
    return { access_token, customer };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
