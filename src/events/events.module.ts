import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEvent } from './app-event.entity';
import { AppEventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppEvent])],
  providers: [AppEventsService],
  exports: [AppEventsService],
})
export class EventsModule {}
