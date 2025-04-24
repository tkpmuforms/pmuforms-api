import { Injectable, UnauthorizedException } from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class FirebaseService {
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
}
