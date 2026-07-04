import { SetMetadata } from '@nestjs/common';
import { UserType as Role } from 'src/generated/prisma/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
