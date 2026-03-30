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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../iam/interfaces/activate-user-data.interface';
import { Permissions } from '../iam/authorization/decorators/permissions.decorator';
import { Permission } from '../iam/authorization/permission.type';
import { Policies } from '../iam/authorization/decorators/policies.decorator';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { UserScopePolicy } from '../iam/authorization/policies/resource-scope.policy';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import type { Request } from 'express';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { BulkImportDryRunDto } from './dto/bulk-import-dry-run.dto';
import { BulkImportApplyDto } from './dto/bulk-import-apply.dto';
import { UsersBulkImportService } from './bulk-import/users-bulk-import.service';
import { GetBulkImportOperationsQueryDto } from './dto/get-bulk-import-operations-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
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

  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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
  @ApiOperation({ summary: 'Get lightweight user directory for chat/calls' })
  @ApiResponse({ status: 200, description: 'Returns list of users with minimal public info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('directory')
  @Permissions(Permission.CHAT_READ)
  getDirectory(@ActiveUser() user: ActiveUserData) {
    return this.usersService.getDirectory(user.sub);
  }

  @ApiOperation({ summary: 'Get paginated list of users' })
  @ApiResponse({ status: 200, description: 'Returns paginated users list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @Permissions(Permission.USERS_READ)
  @Policies(new UserScopePolicy())
  findAll(
    @ActiveUser() user: ActiveUserData,
    @Query() query: GetUsersQueryDto,
  ) {
    return this.usersService.findAll(user, query);
  }

  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Returns the user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  @Permissions(Permission.USERS_READ)
  @Policies(new UserScopePolicy())
  findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.usersService.findOne(+id, user);
  }

  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
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

  @ApiOperation({ summary: 'Update custom permissions for a user (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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

  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
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

  @ApiOperation({ summary: 'Set active/inactive status for a user (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User active status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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

  @ApiOperation({ summary: 'Dry-run a bulk user import from uploaded file (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        mode: { type: 'string', enum: ['upsert'] },
        allowRoleUpdate: { type: 'boolean' },
        allowPermissionUpdate: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Dry-run result returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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

  @ApiOperation({ summary: 'Apply a confirmed bulk user import (admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk import applied successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
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

  @ApiOperation({ summary: 'Get history of bulk import operations (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of bulk import operations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin role required' })
  @Get('bulk-import/operations')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_READ)
  getBulkImportOperations(@Query() query: GetBulkImportOperationsQueryDto) {
    return this.usersBulkImportService.getOperations(query);
  }
}
