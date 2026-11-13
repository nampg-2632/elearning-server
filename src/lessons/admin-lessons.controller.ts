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
import { Roles } from '../common/decorators/roles.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { UserRole } from '../common/enums/user-role.enum';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { AdminLessonsService } from './admin-lessons.service';
import {
  AdminLessonDetailDto,
  AdminLessonDto,
  AdminLessonPageDto,
  AdminLessonWordDto,
} from './dto/admin-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { SetLessonWordsDto } from './dto/set-lesson-words.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@ApiTags('Admin – Lessons')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Roles(UserRole.Admin)
@Controller('admin/lessons')
export class AdminLessonsController {
  constructor(private readonly lessonsService: AdminLessonsService) {}

  // Also the lesson picker on the course form.
  @Get()
  @ApiOkResponse({ type: AdminLessonPageDto })
  list(
    @Query() query: ListLessonsQueryDto,
  ): Promise<Paginated<AdminLessonDto>> {
    return this.lessonsService.list(query);
  }

  @Post()
  @ApiCreatedResponse({ type: AdminLessonDetailDto })
  create(@Body() dto: CreateLessonDto): Promise<AdminLessonDetailDto> {
    return this.lessonsService.create(dto);
  }

  @Get(':lessonId')
  @ApiOkResponse({ type: AdminLessonDetailDto })
  findOne(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<AdminLessonDetailDto> {
    return this.lessonsService.findOne(lessonId);
  }

  @Patch(':lessonId')
  @ApiOkResponse({ type: AdminLessonDetailDto })
  update(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<AdminLessonDetailDto> {
    return this.lessonsService.update(lessonId, dto);
  }

  @Put(':lessonId/words')
  @ApiOkResponse({ type: [AdminLessonWordDto] })
  setWords(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: SetLessonWordsDto,
  ): Promise<AdminLessonWordDto[]> {
    return this.lessonsService.setWords(lessonId, dto.wordIds);
  }

  @Delete(':lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('lessonId', ParseUUIDPipe) lessonId: string): Promise<void> {
    return this.lessonsService.remove(lessonId);
  }
}
