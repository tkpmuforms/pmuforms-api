import { createParamDecorator, ExecutionContext } from '@nestjs/common';
/*
  The artist dashboard a customer is logged in with. Simply holds the customerId
*/
export const GetCustomerAuthContext = createParamDecorator(
  (_: undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.artistId;
  },
);
