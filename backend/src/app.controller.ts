import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Hello world' })
  @ApiResponse({ status: 200, description: 'Returns greeting string' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
