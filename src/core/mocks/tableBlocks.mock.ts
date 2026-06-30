export interface ConclusionTableBlock {
  item_uuid: string
  path: string
  rows: Record<string, unknown>[]
}

export const tableBlocksMock: ConclusionTableBlock[] = [
  {
    item_uuid: 'intervals-block',
    path: 'intervals',
    rows: [
      { number: 1, start_mm: 0, end_mm: 120, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
      { number: 2, start_mm: 120, end_mm: 240, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
      { number: 3, start_mm: 240, end_mm: 360, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
    ],
  },
]
