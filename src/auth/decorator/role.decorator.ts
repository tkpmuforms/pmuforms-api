import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from 'src/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const GetCurrentUserRole = createParamDecorator(
  (_: undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.userRole;
  },
);
