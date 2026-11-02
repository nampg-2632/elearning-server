import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { LessonDetailDto } from './dto/lesson-detail.dto';
import { LessonsService } from './lessons.service';

@ApiTags('Lessons')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // Words and test info; the lesson must be in an approved course.
  @Get(':lessonId')
  @ApiOkResponse({ type: LessonDetailDto })
  findOne(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: User,
  ): Promise<LessonDetailDto> {
    return this.lessonsService.findDetail(user, lessonId);
  }
}
