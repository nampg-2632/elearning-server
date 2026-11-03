import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { TestAttemptDto, TestAttemptResultDto } from './dto/test-attempt.dto';
import { TestAttemptsService } from './test-attempts.service';

@ApiTags('Tests')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@ApiExtraModels(TestAttemptDto, TestAttemptResultDto)
@Controller('test-attempts')
export class TestAttemptsController {
  constructor(private readonly testAttemptsService: TestAttemptsService) {}

  @Post(':attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TestAttemptResultDto })
  submit(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() user: User,
  ): Promise<TestAttemptResultDto> {
    return this.testAttemptsService.submit(user, attemptId, dto);
  }

  // The result with the correct answers once submitted.
  @Get(':attemptId')
  @ApiOkResponse({
    description:
      'TestAttemptDto while doing, TestAttemptResultDto once submitted',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(TestAttemptDto) },
        { $ref: getSchemaPath(TestAttemptResultDto) },
      ],
    },
  })
  findOne(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: User,
  ): Promise<TestAttemptDto | TestAttemptResultDto> {
    return this.testAttemptsService.findOne(user, attemptId);
  }
}
