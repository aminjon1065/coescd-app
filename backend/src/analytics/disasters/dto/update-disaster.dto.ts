import { PartialType } from '@nestjs/swagger';
import { CreateDisasterDto } from './create-disaster.dto';

export class UpdateDisasterDto extends PartialType(CreateDisasterDto) {}
