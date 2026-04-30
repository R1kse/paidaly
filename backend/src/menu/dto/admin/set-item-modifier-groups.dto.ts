import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetItemModifierGroupsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  modifierGroupIds!: string[];
}
