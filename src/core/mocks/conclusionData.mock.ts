export interface IntervalRow {
  number: number
  start_mm: number
  end_mm: number
  defects_info: string
  is_satisfied: string
}

export interface ConclusionData {
  meta: {
    standard: string
    issue_number: string
    date: string
    organization: string
  }
  weld: {
    number: string
    diameter: number
    wall_thickness: number
    material: string
    welder_name: string
  }
  quality: {
    method: string
    equipment: string
    sensitivity: string
    operator_name: string
  }
  summary: {
    is_satisfied: string
    defects_found: boolean
    defects_count: number
  }
  intervals: IntervalRow[]
}

export const conclusionDataMock: ConclusionData = {
  meta: {
    standard: 'СП 86.13330.2022',
    issue_number: '2024-ВИК-0042',
    date: '2024-11-15',
    organization: 'ООО «ТехКонтроль»',
  },
  weld: {
    number: 'С-147',
    diameter: 219.0,
    wall_thickness: 8.0,
    material: '09Г2С',
    welder_name: 'Иванов А.П.',
  },
  quality: {
    method: 'Визуальный и измерительный контроль (ВИК)',
    equipment: 'ШЦ-I 150-0.02',
    sensitivity: 'I уровень',
    operator_name: 'Петров С.В.',
  },
  summary: {
    is_satisfied: 'ГОДЕН',
    defects_found: false,
    defects_count: 0,
  },
  intervals: [
    { number: 1, start_mm: 0, end_mm: 120, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
    { number: 2, start_mm: 120, end_mm: 240, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
    { number: 3, start_mm: 240, end_mm: 360, defects_info: 'Дефектов не обнаружено', is_satisfied: 'Годен' },
  ],
}
