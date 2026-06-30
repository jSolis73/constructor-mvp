export interface FieldCatalogScalar {
  path: string
  title: string
  type: 'string' | 'int' | 'float' | 'bool' | 'date'
  source: 'computed' | 'manual'
  group_name: string
}

export interface FieldCatalogColumn {
  path: string
  title: string
  type: 'string' | 'int' | 'float'
}

export interface FieldCatalogTable {
  path: string
  title: string
  type: 'table'
  source: 'computed' | 'manual'
  group_name: string
  columns: FieldCatalogColumn[]
}

export interface FieldCatalog {
  scalars: FieldCatalogScalar[]
  tables: FieldCatalogTable[]
}

export const fieldCatalogMock: FieldCatalog = {
  scalars: [
    { path: 'meta.standard', title: 'Нормативный документ', type: 'string', source: 'computed', group_name: 'Метаданные' },
    { path: 'meta.issue_number', title: 'Номер заключения', type: 'string', source: 'manual', group_name: 'Метаданные' },
    { path: 'meta.date', title: 'Дата заключения', type: 'date', source: 'computed', group_name: 'Метаданные' },
    { path: 'meta.organization', title: 'Организация', type: 'string', source: 'manual', group_name: 'Метаданные' },

    { path: 'weld.number', title: 'Номер стыка', type: 'string', source: 'computed', group_name: 'Стык' },
    { path: 'weld.diameter', title: 'Диаметр, мм', type: 'float', source: 'computed', group_name: 'Стык' },
    { path: 'weld.wall_thickness', title: 'Толщина стенки, мм', type: 'float', source: 'computed', group_name: 'Стык' },
    { path: 'weld.material', title: 'Материал', type: 'string', source: 'computed', group_name: 'Стык' },
    { path: 'weld.welder_name', title: 'Сварщик', type: 'string', source: 'manual', group_name: 'Стык' },

    { path: 'quality.method', title: 'Метод контроля', type: 'string', source: 'computed', group_name: 'Контроль качества' },
    { path: 'quality.equipment', title: 'Оборудование', type: 'string', source: 'manual', group_name: 'Контроль качества' },
    { path: 'quality.sensitivity', title: 'Чувствительность', type: 'string', source: 'computed', group_name: 'Контроль качества' },
    { path: 'quality.operator_name', title: 'Оператор', type: 'string', source: 'manual', group_name: 'Контроль качества' },

    { path: 'summary.is_satisfied', title: 'Итоговое заключение', type: 'string', source: 'computed', group_name: 'Итоги' },
    { path: 'summary.defects_found', title: 'Обнаружены дефекты', type: 'bool', source: 'computed', group_name: 'Итоги' },
    { path: 'summary.defects_count', title: 'Количество дефектов', type: 'int', source: 'computed', group_name: 'Итоги' },
  ],
  tables: [
    {
      path: 'intervals',
      title: 'Интервалы контроля',
      type: 'table',
      source: 'computed',
      group_name: 'Интервалы',
      columns: [
        { path: 'intervals[].number', title: '№', type: 'int' },
        { path: 'intervals[].start_mm', title: 'Начало, мм', type: 'float' },
        { path: 'intervals[].end_mm', title: 'Конец, мм', type: 'float' },
        { path: 'intervals[].defects_info', title: 'Описание дефектов', type: 'string' },
        { path: 'intervals[].is_satisfied', title: 'Заключение', type: 'string' },
      ],
    },
  ],
}
