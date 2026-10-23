import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { UserRole } from '../common/enums/user-role.enum';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { AdminCoursesService } from './admin-courses.service';
import {
  AdminCourseDetailDto,
  AdminCourseDto,
  AdminCoursePageDto,
  CourseLessonDto,
} from './dto/admin-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListAdminCoursesQueryDto } from './dto/list-admin-courses-query.dto';
import { SetCourseLessonsDto } from './dto/set-course-lessons.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Admin – Courses')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Roles(UserRole.Admin)
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly coursesService: AdminCoursesService) {}

  @Get()
  @ApiOkResponse({ type: AdminCoursePageDto })
  list(
    @Query() query: ListAdminCoursesQueryDto,
  ): Promise<Paginated<AdminCourseDto>> {
    return this.coursesService.list(query);
  }

  @Post()
  @ApiCreatedResponse({ type: AdminCourseDetailDto })
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() admin: User,
  ): Promise<AdminCourseDetailDto> {
    return this.coursesService.create(dto, admin);
  }

  @Get(':courseId')
  @ApiOkResponse({ type: AdminCourseDetailDto })
  findOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<AdminCourseDetailDto> {
    return this.coursesService.findOne(courseId);
  }

  @Patch(':courseId')
  @ApiOkResponse({ type: AdminCourseDetailDto })
  update(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<AdminCourseDetailDto> {
    return this.coursesService.update(courseId, dto);
  }

  @Put(':courseId/lessons')
  @ApiOkResponse({ type: [CourseLessonDto] })
  setLessons(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SetCourseLessonsDto,
  ): Promise<CourseLessonDto[]> {
    return this.coursesService.setLessons(courseId, dto.lessonIds);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('courseId', ParseUUIDPipe) courseId: string): Promise<void> {
    return this.coursesService.remove(courseId);
  }
}
