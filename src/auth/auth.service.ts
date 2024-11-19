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
import { CustomerDocument, UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('Customer') private customerModel: Model<CustomerDocument>,
    private jwtService: JwtService,
    private configService: AppConfigService,
    private firebaseService: FirebaseService,
  ) {}

  private async signToken(userId: string, role: UserRole) {
    const payload = { role, sub: userId };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '30d', // TODO- find how about the jwt expiry
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
      { upsert: true },
    );

    const access_token = await this.signToken(artist.id, UserRole.ARTIST);
    return { access_token, artist };
  }

  async createCustomer(accessToken: string) {
    const auth = await this.firebaseService.verifyIdToken(accessToken);

    //     "auth": {
    //     "name": "Akinola Akinleye",
    //     "picture": "https://lh3.googleusercontent.com/a/ACg8ocIT3W9HpNUZC7gXE6rnbgYdgTrkVljbNViDOQ8gK_AnRI9XrGw=s96-c",
    //     "iss": "https://securetoken.google.com/fir-frontend-b3d9d",
    //     "aud": "fir-frontend-b3d9d",
    //     "auth_time": 1732028165,
    //     "user_id": "yp26mrvalfWtAjebQdlkmIIg5Rg2",
    //     "sub": "yp26mrvalfWtAjebQdlkmIIg5Rg2",
    //     "iat": 1732028165,
    //     "exp": 1732031765,
    //     "email": "akin.akinleye619@gmail.com",
    //     "email_verified": true,
    //     "firebase": {
    //         "identities": {
    //             "google.com": [
    //                 "102843623060718762866"
    //             ],
    //             "email": [
    //                 "akin.akinleye619@gmail.com"
    //             ]
    //         },
    //         "sign_in_provider": "google.com"
    //     },
    //     "uid": "yp26mrvalfWtAjebQdlkmIIg5Rg2"
    // },
    // "customer": null

    const { uid: customerId, email, name, email_verified } = auth;

    if (!email_verified) {
      throw new UnauthorizedException('Email not verified');
    }

    const customer = await this.customerModel.findOneAndUpdate(
      {
        id: customerId,
      },
      { id: customerId, email, info: { client_name: name ?? 'New Customer' } },
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
