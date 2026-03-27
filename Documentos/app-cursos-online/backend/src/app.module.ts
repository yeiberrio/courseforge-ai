import { Module, Controller, Get, SetMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { UploadsModule } from './uploads/uploads.module';
import { GenerationModule } from './generation/generation.module';
import { YouTubeModule } from './youtube/youtube.module';
import { ViralModule } from './viral/viral.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';

@Controller('health')
class HealthController {
  @Get()
  @SetMetadata('isPublic', true)
  check() {
    return { status: 'ok', version: '1.0', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    CoursesModule,
    CourseModulesModule,
    EnrollmentsModule,
    UploadsModule,
    GenerationModule,
    YouTubeModule,
    ViralModule,
    KnowledgeBaseModule,
  ],
})
export class AppModule {}
