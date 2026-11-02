import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { EnrollmentDto } from '../enrollments/dto/enrollment.dto';
import { User } from '../users/entities/user.entity';
import { CoursesService } from './courses.service';
import { CourseDetailDto, CourseDto, CoursePageDto } from './dto/course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';

@ApiTags('Courses')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOkResponse({ type: CoursePageDto })
  list(
    @Query() query: ListCoursesQueryDto,
    @CurrentUser() user: User,
  ): Promise<Paginated<CourseDto>> {
    return this.coursesService.list(user, query);
  }

  @Get(':courseId')
  @ApiOkResponse({ type: CourseDetailDto })
  findOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ): Promise<CourseDetailDto> {
    return this.coursesService.findOne(user, courseId);
  }

  // Sends a request for admin review; a rejected request can be re-sent.
  @Post(':courseId/enroll')
  @ApiCreatedResponse({ type: EnrollmentDto })
  enroll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ): Promise<EnrollmentDto> {
    return this.coursesService.enroll(user, courseId);
  }
}
