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
    page: {
      format: 'A4',
      orientation,
      margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75 },
    },
    cells: [],
    regions: [],
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
      page: {
        format: 'A4',
        orientation: 'portrait',
        margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75 },
      },
      cells: [
        { ref: 'A1', merge: 'A1:H1', value: { literal: 'ЗАКЛЮЧЕНИЕ' }, style: { bold: true, fontSize: 14, horizontalAlign: 'center' } },
        { ref: 'A2', merge: 'A2:H2', value: { literal: 'по визуальному и измерительному контролю' }, style: { fontSize: 11, horizontalAlign: 'center' } },
        { ref: 'A4', value: { literal: 'Нормативный документ:' }, style: { bold: true } },
        { ref: 'C4', merge: 'C4:H4', value: { binding: 'meta.standard' }, style: {} },
        { ref: 'A5', value: { literal: 'Номер заключения:' }, style: { bold: true } },
        { ref: 'C5', value: { binding: 'meta.issue_number' }, style: {} },
        { ref: 'E5', value: { literal: 'Дата:' }, style: { bold: true } },
        { ref: 'F5', merge: 'F5:H5', value: { binding: 'meta.date' }, style: {} },
        { ref: 'A7', value: { literal: 'Стык №:' }, style: { bold: true } },
        { ref: 'C7', value: { binding: 'weld.number' }, style: {} },
        { ref: 'A8', value: { literal: 'Диаметр / толщина:' }, style: { bold: true } },
        { ref: 'C8', value: { template: '{weld.diameter} мм / {weld.wall_thickness} мм' }, style: {} },
        { ref: 'A9', value: { literal: 'Материал:' }, style: { bold: true } },
        { ref: 'C9', value: { binding: 'weld.material' }, style: {} },
        { ref: 'A10', value: { literal: 'Метод контроля:' }, style: { bold: true } },
        { ref: 'C10', merge: 'C10:H10', value: { binding: 'quality.method' }, style: {} },
        { ref: 'A12', merge: 'A12:H12', value: { literal: 'ИТОГОВОЕ ЗАКЛЮЧЕНИЕ:' }, style: { bold: true, fontSize: 12 } },
        { ref: 'A13', merge: 'A13:H13', value: { binding: 'summary.is_satisfied' }, style: { bold: true, fontSize: 14, horizontalAlign: 'center' } },
      ],
      regions: [],
    },
  },
]
