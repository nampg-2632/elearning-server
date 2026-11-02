import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { UserRole } from '../common/enums/user-role.enum';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { AdminUserCoursesService } from './admin-user-courses.service';
import {
  AdminUserCourseDto,
  AdminUserCoursePageDto,
} from './dto/admin-user-course.dto';
import { ListUserCoursesQueryDto } from './dto/list-user-courses-query.dto';
import { RejectUserCourseDto } from './dto/reject-user-course.dto';

@ApiTags('Admin – User courses')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Roles(UserRole.Admin)
@Controller('admin/user-courses')
export class AdminUserCoursesController {
  constructor(private readonly userCoursesService: AdminUserCoursesService) {}

  @Get()
  @ApiOkResponse({ type: AdminUserCoursePageDto })
  list(
    @Query() query: ListUserCoursesQueryDto,
  ): Promise<Paginated<AdminUserCourseDto>> {
    return this.userCoursesService.list(query);
  }

  @Patch(':id/approve')
  @ApiOkResponse({ type: AdminUserCourseDto })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ): Promise<AdminUserCourseDto> {
    return this.userCoursesService.approve(id, admin);
  }

  @Patch(':id/reject')
  @ApiOkResponse({ type: AdminUserCourseDto })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectUserCourseDto,
    @CurrentUser() admin: User,
  ): Promise<AdminUserCourseDto> {
    return this.userCoursesService.reject(id, admin, dto.reason);
  }
}
