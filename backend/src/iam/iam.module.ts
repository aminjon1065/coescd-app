import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { AuthenticationService } from './authentication/authentication.service';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage/refresh-token-ids.storage';
import { PolicyHandlersStorage } from './authorization/policies/policy-handlers.storage';
import { FrameworkContributorPolicyHandler } from './authorization/policies/framework-contributor.policy';
import { PoliciesGuard } from './authorization/guards/policies.guard';
import { RolesGuard } from './authorization/guards/roles.guard';
import { PermissionsGuard } from './authorization/guards/permission.guard';
import { Document } from '../document/entities/document.entity';
import { Task } from '../task/entities/task.entity';
import {
  DocumentScopePolicyHandler,
  TaskScopePolicyHandler,
  UserScopePolicyHandler,
} from './authorization/policies/resource-scope.policy';
import { IamSeedService } from './seeds/iam-seed.service';
import { ScopeService } from './authorization/scope.service';
import { AuthRateLimitService } from './authentication/auth-rate-limit.service';
import { AuthAuditService } from './authentication/auth-audit.service';
import { AuthAuditLog } from './authentication/entities/auth-audit-log.entity';
import { AuthorizationAdminController } from './authorization/authorization-admin.controller';
import { RolePermissionProfile } from './authorization/entities/role-permission-profile.entity';
import { RolePermissionsService } from './authorization/role-permissions.service';
import { AuditLogsAdminController } from './audit/audit-logs-admin.controller';
import { AuditLogsAdminService } from './audit/audit-logs-admin.service';
import { FileAccessAuditEntity } from '../files/entities/file-access-audit.entity';
import { UserChangeAuditLog } from '../users/entities/user-change-audit-log.entity';
import { ScopeResolverService } from './authorization/scope-resolver.service';
import { OrgUnit } from './entities/org-unit.entity';
import { IamDelegation } from '../edm/entities/iam-delegation.entity';
import { BusinessRoleEntity } from './authorization/entities/business-role.entity';
import { PermissionProfile } from './authorization/entities/permission-profile.entity';
import { BusinessRolePermissionProfile } from './authorization/entities/business-role-permission-profile.entity';
import { DelegationContextService } from './authentication/delegation-context.service';
import { DelegationValidationMiddleware } from './authentication/middleware/delegation-validation.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Document,
      Task,
      AuthAuditLog,
      RolePermissionProfile,
      PermissionProfile,
      BusinessRoleEntity,
      BusinessRolePermissionProfile,
      OrgUnit,
      IamDelegation,
      FileAccessAuditEntity,
      UserChangeAuditLog,
    ]),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [
    { provide: HashingService, useClass: BcryptService },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
    AccessTokenGuard,
    RefreshTokenIdsStorage,
    AuthenticationService,
    PolicyHandlersStorage,
    FrameworkContributorPolicyHandler,
    UserScopePolicyHandler,
    DocumentScopePolicyHandler,
    TaskScopePolicyHandler,
    IamSeedService,
    ScopeResolverService,
    ScopeService,
    AuthRateLimitService,
    AuthAuditService,
    DelegationContextService,
    RolePermissionsService,
    AuditLogsAdminService,
  ],
  exports: [RefreshTokenIdsStorage, ScopeService, ScopeResolverService],
  controllers: [
    AuthenticationController,
    AuthorizationAdminController,
    AuditLogsAdminController,
  ],
})
export class IamModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(DelegationValidationMiddleware).forRoutes('*');
  }
}
