import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, FirebaseService],
})
export class CustomersModule {}
