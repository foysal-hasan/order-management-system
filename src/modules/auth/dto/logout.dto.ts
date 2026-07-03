import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional } from "class-validator";
import { IsCuid } from "src/common/validators/is-cuid.validator";

export class LogoutDto {
    @ApiPropertyOptional({
        description: 'Session ID to logout from. If not provided, logs out from current session.',
        example: 'cuid1234567890abcdef12345678',
    })
    @IsOptional()
    @IsCuid()
    sessionId: string;
}