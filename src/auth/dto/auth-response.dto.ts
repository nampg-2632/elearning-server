import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description:
      'Opaque token for POST /auth/refresh. Single use: each refresh returns a new one, and sending a used one again signs out the session.',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Refresh token lifetime in seconds',
    example: 2592000,
  })
  refreshExpiresIn: number;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
