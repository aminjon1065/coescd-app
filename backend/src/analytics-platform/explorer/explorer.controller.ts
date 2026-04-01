import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../iam/authentication/guards/access-token/access-token.guard';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import type { ActiveUserData } from '../../iam/interfaces/activate-user-data.interface';
import { ExplorerService } from './explorer.service';

@UseGuards(AccessTokenGuard)
@Controller('analytics/explorer')
export class ExplorerController {
  constructor(private readonly svc: ExplorerService) {}

  @Get('tables')
  getAllowedTables() {
    return this.svc.getAllowedTables();
  }

  @Post('query')
  async query(
    @Body() body: { mode: 'sql' | 'builder'; sql?: string; builder?: any; params?: unknown[] },
    @ActiveUser() user: ActiveUserData,
  ) {
    // Only admin/analyst roles get raw SQL access
    const isAnalyst = (user as any).roles?.includes('admin') || (user as any).roles?.includes('analyst');

    if (body.mode === 'sql') {
      if (!isAnalyst) {
        return { error: 'Raw SQL access requires analyst role' };
      }
      return this.svc.execute(body.sql!, body.params ?? [], true);
    }

    const sql = this.svc.buildSql(body.builder);
    const filterValues = (body.builder?.filters ?? []).map((f: any) => f.value);
    return this.svc.execute(sql, filterValues, false);
  }
}
