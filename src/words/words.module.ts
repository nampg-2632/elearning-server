import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';

@Module({
  imports: [TypeOrmModule.forFeature([Word, LessonWord])],
  controllers: [WordsController],
  providers: [WordsService],
  exports: [TypeOrmModule],
})
export class WordsModule {}
