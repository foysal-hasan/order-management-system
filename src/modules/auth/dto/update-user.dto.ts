import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'username',
    example: 'jhondeo',
  })
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'title',
    example: 'I am a artist',
  })
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'about',
    example: 'About yourself',
  })
  @IsOptional()
  about?: string;

  @ApiProperty({
    description: 'A list of user skills',
    example: ['Guitar', 'Music Production', 'Songwriting'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each skill must be a string' })
  skils?: string[];

  @ApiProperty({
    description: 'experience',
    example: '10+ years',
  })
  @IsOptional()
  experience?: string;

  @ApiProperty({
    description: 'A list of user instrument',
    example: ['Guitar', 'Piano'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Each instrument must be a string' })
  instrument?: string[];

  @ApiProperty({
    description: 'A list of user language',
    example: ['English', 'Bengoli'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true, message: 'Each language must be a string' })
  @IsOptional()
  language?: string[];

  @ApiProperty({
    description: 'online status',
    example: 'jhondeo',
  })
  @IsOptional()
  online_status?: string;

  @ApiProperty({
    description: 'online status',
    example: 'jhondeo',
  })
  @IsOptional()
  type?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Country',
    example: 'Nigeria',
  })
  country?: string;

  @IsOptional()
  @ApiProperty({
    description: 'State',
    example: 'Lagos',
  })
  state?: string;

  @IsOptional()
  @ApiProperty({
    description: 'City',
    example: 'Lagos',
  })
  city?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Local government',
    example: 'Lagos',
  })
  local_government?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Zip code',
    example: '123456',
  })
  zip_code?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  phone_number?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Address',
    example: 'New York, USA',
  })
  address?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Gender',
    example: 'male',
  })
  gender?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Date of birth',
    example: '14/11/2001',
  })
  date_of_birth?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Role',
    example: 'user',
  })
  role?: string;

  @IsOptional()
  @IsBoolean()
  order_email?: boolean;

  @IsOptional()
  @IsBoolean()
  order_push?: boolean;

  @IsOptional()
  @IsBoolean()
  message_email?: boolean;

  @IsOptional()
  @IsBoolean()
  message_push?: boolean;

  @IsOptional()
  @IsBoolean()
  earning_email?: boolean;

  @IsOptional()
  @IsBoolean()
  earning_push?: boolean;

  @IsOptional()
  @IsBoolean()
  promo_email?: boolean;

  @IsOptional()
  @IsBoolean()
  promo_push?: boolean;
}
