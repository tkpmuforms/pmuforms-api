import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Global()
@Module({
  providers: [UtilsService, FirebaseService],
  exports: [UtilsService],
})
export class UtilsModule {}
