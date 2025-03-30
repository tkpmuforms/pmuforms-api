import { Injectable, UnauthorizedException } from '@nestjs/common';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import path from 'node:path';

@Injectable()
export class FirebaseService {
  constructor() {
    // initialize firebase admin

    // initialize firebase admin
    const serviceAccountCredentialsPath = path.join(
      __dirname,
      '..',
      '..',
      'secrets',
      'firebase-service-account-credentials.json',
    );
    try {
      initializeApp({
        credential: cert(serviceAccountCredentialsPath),
      });
    } catch (error: any) {
      console.info(`Failed to initialize firebase admin.
        Suggestion: Create a file called '/secrets/firebase-service-account-credentials.json' in the project base directory with the appropriate firebase service account secrets from the firebase console. \n`);
      console.error({ error });
    }
  }

  async verifyIdToken(idToken: string) {
    {
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
  }

  async sendPushNotification(params: {
    title: string;
    body: string;
    fcmToken: string;
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
