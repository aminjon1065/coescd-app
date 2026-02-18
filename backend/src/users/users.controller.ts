import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.Admin)
  @Permissions(Permission.USERS_CREATE)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions(Permission.USERS_READ)
  @Policies(new UserScopePolicy())
  findAll(@ActiveUser() user: ActiveUserData) {
    return this.usersService.findAll(user);
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
  ) {
    return this.usersService.update(+id, updateUserDto, user);
  }

  @Patch(':id/permissions')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_UPDATE)
  updateCustomPermissions(
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
  ) {
    return this.usersService.updateCustomPermissions(+id, dto.permissions);
  }

  @Delete(':id')
  @Permissions(Permission.USERS_DELETE)
  @Policies(new UserScopePolicy())
  remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
    return this.usersService.remove(+id, user);
  }

  @Patch(':id/active')
  @Roles(Role.Admin)
  @Permissions(Permission.USERS_UPDATE)
  setActive(@Param('id') id: string, @Body() dto: SetUserActiveDto) {
    return this.usersService.setActive(+id, dto.isActive);
  }
}
