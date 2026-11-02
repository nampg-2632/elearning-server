import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLessonsController } from './admin-lessons.controller';
import { Lesson } from './entities/lesson.entity';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  controllers: [AdminLessonsController, LessonsController],
  providers: [LessonsService],
  exports: [TypeOrmModule, LessonsService],
})
export class LessonsModule {}
