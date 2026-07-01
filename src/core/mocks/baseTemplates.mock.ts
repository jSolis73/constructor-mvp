import type { JsonSpec } from '../spec/types'
import { nanoid } from '../utils/nanoid'

export interface BaseTemplate {
  id: string
  name: string
  description: string
  spec: JsonSpec
}

function emptySpec(name: string, orientation: 'portrait' | 'landscape'): JsonSpec {
  return {
    id: nanoid(),
    name,
    version: 1,
    page: {
      format: 'A4',
      orientation,
      margins: { left: 20, right: 10, top: 15, bottom: 15 },
    },
    cells: [],
    regions: [],
    footer_cells: [],
  }
}

export const baseTemplatesMock: BaseTemplate[] = [
  {
    id: 'blank-portrait',
    name: 'Пустой (А4 портрет)',
    description: 'Чистый лист А4, вертикальная ориентация',
    spec: emptySpec('Новый шаблон', 'portrait'),
  },
  {
    id: 'blank-landscape',
    name: 'Пустой (А4 альбом)',
    description: 'Чистый лист А4, горизонтальная ориентация',
    spec: emptySpec('Новый шаблон (альбом)', 'landscape'),
  },
  {
    id: 'gost-vik',
    name: 'На основе ГОСТ (ВИК)',
    description: 'Заготовка заключения по визуальному и измерительному контролю',
    spec: {
      id: nanoid(),
      name: 'Заключение ВИК',
      version: 1,
      page: {
        format: 'A4',
        orientation: 'portrait',
        margins: { left: 20, right: 10, top: 15, bottom: 15 },
      },
      cells: [
        { ref: 'A1', merge: 'A1:H1', value: { literal: 'ЗАКЛЮЧЕНИЕ' }, style: { bold: true, size: 14, align: 'center' } },
        { ref: 'A2', merge: 'A2:H2', value: { literal: 'по визуальному и измерительному контролю' }, style: { size: 11, align: 'center' } },
        { ref: 'A4', value: { literal: 'Нормативный документ:' }, style: { bold: true } },
        { ref: 'C4', merge: 'C4:H4', value: { binding: 'meta.standard' }, style: { border: 'thin' } },
        { ref: 'A5', value: { literal: 'Номер заключения:' }, style: { bold: true } },
        { ref: 'C5', value: { binding: 'meta.issue_number' }, style: { border: 'thin' } },
        { ref: 'E5', value: { literal: 'Дата:' }, style: { bold: true } },
        { ref: 'F5', merge: 'F5:H5', value: { binding: 'meta.date' }, style: { border: 'thin' } },
        { ref: 'A7', value: { literal: 'Стык №:' }, style: { bold: true } },
        { ref: 'C7', value: { binding: 'weld.number' }, style: { border: 'thin' } },
        { ref: 'A8', value: { literal: 'Диаметр / толщина:' }, style: { bold: true } },
        { ref: 'C8', value: { template: '{weld.diameter} мм / {weld.wall_thickness} мм' }, style: { border: 'thin' } },
        { ref: 'A9', value: { literal: 'Материал:' }, style: { bold: true } },
        { ref: 'C9', value: { binding: 'weld.material' }, style: { border: 'thin' } },
        { ref: 'A10', value: { literal: 'Метод контроля:' }, style: { bold: true } },
        { ref: 'C10', merge: 'C10:H10', value: { binding: 'quality.method' }, style: { border: 'thin' } },
        { ref: 'A12', merge: 'A12:H12', value: { literal: 'ИТОГОВОЕ ЗАКЛЮЧЕНИЕ:' }, style: { bold: true, size: 12 } },
        { ref: 'A13', merge: 'A13:H13', value: { binding: 'summary.is_satisfied' }, style: { bold: true, size: 14, align: 'center' } },
      ],
      regions: [],
      footer_cells: [],
    },
  },
]
