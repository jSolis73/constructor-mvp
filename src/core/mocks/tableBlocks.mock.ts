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
  {
    item_uuid: 'defects-block',
    path: 'defects',
    rows: [],
  },
  {
    item_uuid: 'measurements-block',
    path: 'measurements',
    rows: [
      { number: 1, parameter: 'Смещение кромок', nominal_mm: 0, actual_mm: 0.3, deviation_mm: 0.3, is_satisfied: 'Годен' },
      { number: 2, parameter: 'Усиление шва', nominal_mm: 2.0, actual_mm: 2.1, deviation_mm: 0.1, is_satisfied: 'Годен' },
      { number: 3, parameter: 'Ширина шва', nominal_mm: 18.0, actual_mm: 18.5, deviation_mm: 0.5, is_satisfied: 'Годен' },
    ],
  },
  {
    item_uuid: 'probes-block',
    path: 'probes',
    rows: [
      { number: 1, label: 'П-001', location: 'Зона сварного шва', result: 'Соответствует', is_satisfied: 'Годен' },
    ],
  },
]
