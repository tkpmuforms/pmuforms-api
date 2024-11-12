import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '<h1> PMUForms- API 🔥 </h1>';
  }

  healthCheck(): any {
    return { health: true };
  }
}
