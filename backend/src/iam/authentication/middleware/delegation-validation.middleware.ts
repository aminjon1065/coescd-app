import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class DelegationValidationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const delegationIdHeader = req.header('x-delegation-id');
    const onBehalfOfHeader = req.header('x-on-behalf-of-user-id');

    if (!delegationIdHeader && !onBehalfOfHeader) {
      return next();
    }

    if (!delegationIdHeader) {
      throw new BadRequestException('x-delegation-id is required when delegating');
    }

    const delegationId = Number(delegationIdHeader);
    if (!Number.isInteger(delegationId) || delegationId <= 0) {
      throw new BadRequestException('x-delegation-id must be a positive integer');
    }

    let onBehalfOfUserId: number | null = null;
    if (onBehalfOfHeader !== undefined) {
      onBehalfOfUserId = Number(onBehalfOfHeader);
      if (!Number.isInteger(onBehalfOfUserId) || onBehalfOfUserId <= 0) {
        throw new BadRequestException(
          'x-on-behalf-of-user-id must be a positive integer',
        );
      }
    }

    (req as any).delegationIntent = {
      delegationId,
      onBehalfOfUserId,
    };

    next();
  }
}
