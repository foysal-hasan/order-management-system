import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password', 'email'] as const)) {

  @ApiPropertyOptional({
    description: 'User profile image',
    type: 'string',
    format: 'binary',
  })
  image?: File;

  avatar?: string;
}
