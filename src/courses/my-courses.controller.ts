import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { CoursesService } from './courses.service';
import { CourseDetailDto, MyCoursePageDto } from './dto/course.dto';
import { ListMyCoursesQueryDto } from './dto/list-my-courses-query.dto';

@ApiTags('Courses')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('me/courses')
export class MyCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Courses the user has enrolled in, newest enrollment first.
  @Get()
  @ApiOkResponse({ type: MyCoursePageDto })
  list(
    @Query() query: ListMyCoursesQueryDto,
    @CurrentUser() user: User,
  ): Promise<Paginated<CourseDetailDto>> {
    return this.coursesService.listMine(user, query);
  }
}
