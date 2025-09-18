import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { FirebaseAuthError, getAuth } from 'firebase-admin/auth';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class FirebaseService {
  readonly logger = new Logger(FirebaseService.name);

  constructor(private config: AppConfigService) {
    try {
      if (!firebaseAdmin.apps.length) {
        // initialize firebase admin
        const firebaseSirverAccoutCred = this.config.get(
          'FIREBASE_SERVICE_ACCOUNT_JSON',
        );
        const serviceAccount = JSON.parse(firebaseSirverAccoutCred);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
      }
    } catch (error: any) {
      console.info('Failed to initialize firebase admin.');
      console.error({ error });
      throw error;
    }
  }

  async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException(error.message);
      }
      console.log(error);
      throw new UnauthorizedException('Cannot validate login');
    }
  }

  async sendPushNotification(params: {
    title: string;
    body: string;
    fcmToken?: string;
  }) {
    try {
      const { title, body, fcmToken } = params;
      if (!fcmToken) {
        return;
      }
      const message = {
        notification: { title, body },
        token: fcmToken,
      };
      await getMessaging().send(message);
    } catch {
      console.error('Failed to send push notification');
    }
  }

  async getUserById(uid: string) {
    try {
      const user = await firebaseAdmin.auth().getUser(uid);
      return user;
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async generateEmailVerificationLink(email: string) {
    try {
      const link = await firebaseAdmin
        .auth()
        .generateEmailVerificationLink(email);
      return link;
    } catch (error) {
      console.error({ error });
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updateEmail(uid: string, email: string) {
    try {
      const user = await firebaseAdmin.auth().updateUser(uid, { email });
      return user;
    } catch (error: unknown) {
      console.log('here');
      if (error instanceof FirebaseAuthError) {
        if (error.code === 'auth/user-not-found') {
          return null;
        }
        if (error.code === 'auth/email-already-exists') {
          throw new BadRequestException('User with email already exists');
        }
      }
      console.error({ error });
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async createUser(params: {
    email: string;
    password?: string;
    displayName: string;
  }) {
    try {
      const { email, password, displayName } = params;
      const user = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName,
      });
      return user;
    } catch (error) {
      this.logger.error(
        `::: Failed to create user with ${params.email}, cause => ${error}`,
      );
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async deleteUser(uid: string) {
    try {
      await firebaseAdmin.auth().deleteUser(uid);
    } catch (error) {
      console.error({ error });
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updateUserPassword(uid: string, password: string) {
    try {
      await firebaseAdmin.auth().updateUser(uid, { password: password });
    } catch {
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await firebaseAdmin.auth().getUserByEmail(email);
      return user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async verifyUserEmail(uid: string) {
    try {
      await firebaseAdmin.auth().updateUser(uid, { emailVerified: true });
    } catch (error) {
      console.error({ error });
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async deleteFileFromBucket(filePath: string) {
    try {
      await firebaseAdmin.storage().bucket().file(filePath).delete();
    } catch (error) {
      console.error({ error });
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
