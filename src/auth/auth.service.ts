import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SignInDto, SignUpDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/config.service';

export interface IUser {
  email: string;
  password: string;
  firstName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<IUser>,
    private jwtService: JwtService,
    private configService: AppConfigService,
  ) {}

  /* Sign up a new user */
  async signUp(signUpDto: SignUpDto): Promise<IUser> {
    const { email, password } = signUpDto;
    // handle already existing user
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException(`User with #${email} already exists`);
    }
    //
    const hashedPassword = await argon.hash(password);
    const newUser = await this.userModel.create({
      ...signUpDto,
      password: hashedPassword,
    });

    return newUser;
  }

  private async signToken(userId: string, email: string) {
    const payload = { email, sub: userId };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '30d',
    });
    return token;
  }

  /* Sign In- creates a JWT */
  async signIn(
    signInDto: SignInDto,
  ): Promise<{ user: IUser; access_token: string }> {
    const { email, password } = signInDto;

    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    const isValidPassword = await argon.verify(existingUser.password, password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signToken(
      existingUser._id.toString(),
      existingUser.email,
    );

    return {
      access_token: accessToken,
      user: existingUser,
    };
  }

  async me(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
