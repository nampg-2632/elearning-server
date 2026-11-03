import {
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { TestAttemptDto } from './dto/test-attempt.dto';
import { TestAttemptsService } from './test-attempts.service';

@ApiTags('Tests')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('lessons/:lessonId/test')
export class LessonTestController {
  constructor(private readonly testAttemptsService: TestAttemptsService) {}

  // Starts the lesson's test, or resumes the attempt in progress.
  @Post('attempts')
  @ApiCreatedResponse({ type: TestAttemptDto, description: 'New attempt' })
  @ApiOkResponse({
    type: TestAttemptDto,
    description: 'An attempt was already in progress',
  })
  async start(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TestAttemptDto> {
    const { attempt, created } = await this.testAttemptsService.start(
      user,
      lessonId,
    );
    if (!created) {
      res.status(HttpStatus.OK);
    }
    return attempt;
  }
}
