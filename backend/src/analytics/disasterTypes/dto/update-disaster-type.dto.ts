import { PartialType } from '@nestjs/swagger';
import { CreateDisasterTypeDto } from './create-disaster-type.dto';

export class UpdateDisasterTypeDto extends PartialType(CreateDisasterTypeDto) {}
