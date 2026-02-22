import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { UserScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { Request } from 'express';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { BulkImportDryRunDto } from './dto/bulk-import-dry-run.dto';
import { BulkImportApplyDto } from './dto/bulk-import-apply.dto';
import { UsersBulkImportService } from './bulk-import/users-bulk-import.service';
import { GetBulkImportOperationsQueryDto } from './dto/get-bulk-import-operations-query.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersBulkImportService: UsersBulkImportService,
  ) {}

  private getRequestIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip ?? 'unknown';
  }

  private getUserAgent(request: Request): string {
    return request.headers['user-agent'] ?? 'unknown';
  }

  @Roles(Role.Admin)
  @Permissions(Permission.USERS_CREATE)
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersService.create(createUserDto, user, {
      ip: this.getRequestIp(request),
      userAgent: this.getUserAgent(request),
    });
  }

  /**
   * Lightweight directory for Chat/Calls — available to any user with chat.read.
   * Returns minimal public info (id, name, position, avatar, department).
   * Must be declared before :id route to avoid shadowing.
   */
  @Get('directory')
  @Permissions(Permission.CHAT_READ)
  getDirectory(@ActiveUser() user: ActiveUserData) {
    return this.usersService.getDirectory(user.sub);
  }

  @Get()
  @Permissions(Permission.USERS_READ)
  @Policies(new UserScopePolicy())
  findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetUsersQueryDto,
  ) {
    return this.usersService.findAll(user, query);
  }

  @Get(':id')
  @Permissions(Permission.USERS_READ)
  @Policies(new UserScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.usersService.findOne(+id, user);
  }

  @Patch(':id')
  @Permissions(Permission.USERS_UPDATE)
  @Policies(new UserScopePolicy())
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersService.update(+id, updateUserDto, user, {
      ip: this.getRequestIp(request),
      userAgent: this.getUserAgent(request),
    });
  }

  @Patch(':id/permissions')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_UPDATE)
  updateCustomPermissions(
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersService.updateCustomPermissions(
      +id,
      dto.permissions,
      user,
      {
        ip: this.getRequestIp(request),
        userAgent: this.getUserAgent(request),
      },
    );
  }

  @Delete(':id')
  @Permissions(Permission.USERS_DELETE)
  @Policies(new UserScopePolicy())
  remove(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersService.remove(+id, user, {
      ip: this.getRequestIp(request),
      userAgent: this.getUserAgent(request),
    });
  }

  @Patch(':id/active')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_UPDATE)
  setActive(
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersService.setActive(+id, dto.isActive, user, {
      ip: this.getRequestIp(request),
      userAgent: this.getUserAgent(request),
    });
  }

  @Post('bulk-import/dry-run')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_CREATE, Permission.USERS_UPDATE)
  @UseInterceptors(FileInterceptor('file'))
  dryRunBulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BulkImportDryRunDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.usersBulkImportService.dryRun(file, dto, user);
  }

  @Post('bulk-import/apply')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_CREATE, Permission.USERS_UPDATE)
  @HttpCode(HttpStatus.OK)
  applyBulkImport(
    @Body() dto: BulkImportApplyDto,
    @ActiveUser() user: ActiveUserData,
    @Req() request: Request,
  ) {
    return this.usersBulkImportService.apply(dto, user, {
      ip: this.getRequestIp(request),
      userAgent: this.getUserAgent(request),
    });
  }

  @Get('bulk-import/operations')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_READ)
  getBulkImportOperations(@Query() query: GetBulkImportOperationsQueryDto) {
    return this.usersBulkImportService.getOperations(query);
  }
}
