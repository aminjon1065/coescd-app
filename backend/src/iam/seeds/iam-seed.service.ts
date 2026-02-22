import { Injectable, Logger } from '@nestjs/common';
import { EnterpriseIamSeed } from './enterprise.seed';

@Injectable()
export class IamSeedService {
  private readonly logger = new Logger(IamSeedService.name);

  constructor(private readonly enterpriseSeed: EnterpriseIamSeed) {}

  async seed(): Promise<void> {
    const enabled = (process.env.IAM_SEED_ENABLED ?? 'false') === 'true';
    if (!enabled) {
      this.logger.log('IAM seed disabled (IAM_SEED_ENABLED=false).');
      return;
    }

    const mode = process.env.IAM_SEED_MODE ?? 'enterprise';
    if (mode !== 'enterprise') {
      this.logger.log(
        `IAM seed skipped. IAM_SEED_MODE=${mode} (expected enterprise).`,
      );
      return;
    }

    await this.enterpriseSeed.run();
  }
}
