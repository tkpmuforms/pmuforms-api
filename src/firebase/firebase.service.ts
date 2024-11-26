import { Injectable, UnauthorizedException } from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class FirebaseService {
  constructor(private config: AppConfigService) {
    // initialize firebase admin

    const serviceAccountCreditials = JSON.parse(
      config.get('FIREBASE_ADMIN_CREDENTIALS'),
    );
    try {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccountCreditials),
      });
    } catch (error: any) {
      console.info(`Failed to initialize firebase admin.
        Suggestion: The admin credentials are in JSON formate.\n Make sure the admin credentials are on a single line in your env file  \n`);
      console.error({ error });
    }
  }

  async verifyIdToken(idToken: string) {
    {
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        return decodedToken;
      } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        throw new UnauthorizedException('Cannot validate login');
      }
    }
  }
}
