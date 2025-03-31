import { SpecificationInstaleap } from 'src/common';
import { SpecificationResponseDto } from 'src/modules/product/dto';

export class InstaleapMapper {
  /**
   * Maps a string of specifications to an array of SpecificationInstaleap
   * @param specifications
   * @returns
   */
  mapSpecifications(
    specifications: SpecificationResponseDto[],
  ): SpecificationInstaleap[] {
    if (!specifications || specifications.length === 0) return [];

    return [
      {
        title: 'Detalles',
        values: specifications.map((spec) => ({
          label: spec.title,
          value: spec.description,
        })),
      },
    ];
  }

  /**
   * Maps a string of search keywords to an array of string
   * @param searchKeywords
   * @returns
   */
  mapSearchKeywords(searchKeywords: string[]): string {
    if (!searchKeywords || searchKeywords.length === 0) return '';

    return searchKeywords.join(', ');
  }
}
