import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { Call } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { IamModule } from '../iam/iam.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from '../iam/config/jwt.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    IamModule,
  ],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
