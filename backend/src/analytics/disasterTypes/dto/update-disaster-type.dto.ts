import { PartialType } from '@nestjs/mapped-types';
import { CreateDisasterTypeDto } from './create-disaster-type.dto';

export class UpdateDisasterTypeDto extends PartialType(CreateDisasterTypeDto) {}
