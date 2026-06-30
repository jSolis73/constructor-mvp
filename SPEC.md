# SPEC.md — Конструктор заключений (MVP)

> **Модуль:** Конструктор заключений — визуальный редактор форм
> **Версия документа:** 1.0 (MVP)
> **Стек:** React 18 · TypeScript · PrimeReact · Univer Sheets · ExcelJS
> **Статус:** Черновик для согласования

---

## 1. Цель MVP

Реализовать минимально жизнеспособную версию frontend-части модуля «Конструктор заключений», демонстрирующую, что Univer Sheets закрывает требуемый функционал визуального редактора Excel-форм, описанный в исходной технической спецификации.

MVP должен наглядно показать:

- создание и редактирование шаблона заключения в Excel-подобном интерфейсе;
- работу с каталогом полей (Field Catalog) и привязку ячеек к данным (binding);
- объединение ячеек, настройку стилей, динамическую таблицу с переменным числом строк;
- сохранение/загрузку JSON-spec шаблона;
- предварительный просмотр с подставленными тестовыми данными;
- генерацию итогового `.xlsx`-файла на клиенте.

MVP **не включает**: backend, реальную интеграцию с Field Catalog API, авторизацию, выдачу заключений (IssuedConclusion), хранение в MinIO. Все данные — мокированы на клиенте.

---

## 2. Технологический стек

| Слой | Технология | Версия | Назначение |
|---|---|---|---|
| Язык | TypeScript | ^5.4 | Статическая типизация |
| Framework | React | ^18.3 | UI-слой приложения |
| Сборка | Vite | ^5.x | Dev-сервер и бандлинг |
| Редактор таблиц | Univer Sheets (`@univerjs/presets`, `@univerjs/preset-sheets-core`) | 0.25.1 | Визуальный конструктор форм |
| UI-кит | PrimeReact | см. раздел 2.1 | Sidebar, кнопки, dropdown, dialog, toolbar |
| Иконки | PrimeIcons | ^7.x | Иконки для PrimeReact-компонентов |
| Генерация XLSX | ExcelJS | ^4.4 | Клиентский рендер итогового файла |
| Стейт-менеджмент | Zustand | ^4.x | Лёгкое глобальное состояние (текущий шаблон, выбранная ячейка) |
| Валидация | Zod | ^3.x | Валидация JSON-spec перед сохранением |

### 2.1 Решение по версии PrimeReact

> ⚠️ **Важная оговорка, требующая согласования.**

В задании указана версия **9.6**. По факту это `primereact@9.6.5` — последний релиз ветки **v9-stable** (вышел в июле 2025, фиксация перед переходом на новую систему тем в v10). Актуальная стабильная линейка на момент написания спецификации — **10.9.8**.

Дополнительный риск: репозиторий PrimeReact как самостоятельный open-source проект **архивирован 28 июня 2026** — разработка переносится в новый бренд **PrimeUI** (primeui.dev). Существующие MIT-версии (включая 9.x и 10.x) остаются доступны и рабочими навсегда, но дальнейших фич/патчей в текущих пакетах ожидать не стоит без перехода на PrimeUI.

**Рекомендация для MVP:** зафиксировать `primereact@9.6.5` как явно указано в задании — пакет стабилен, имеет завершённый набор компонентов (Sidebar, SplitButton, Dropdown, Dialog, Toolbar, Tree, DataTable) и не зависит от внешних брейкинг-чейнджей v10. Это сознательный компромисс: версия не самая новая, но предсказуемая для MVP-демонстрации.

```json
{
  "dependencies": {
    "primereact": "9.6.5",
    "primeicons": "^7.0.0"
  }
}
```

> Если впоследствии потребуется миграция на PrimeUI/v10 — это отдельная задача вне рамок MVP, изоляция UI-кита через собственные обёртки-компоненты (см. раздел 6.4) минимизирует стоимость такого перехода.

---

## 3. Архитектура MVP

```
+-------------------------------------------------------------------+
|                         React App (Vite)                          |
|                                                                     |
|  +---------------+   +---------------------+   +----------------+ |
|  |  AppShell      |   |   TemplateEditor     |   |  PreviewModal  | |
|  |  (PrimeReact   |-->|   (Univer Sheets)     |-->|  (Univer       | |
|  |   Toolbar)     |   |                       |   |   read-only)   | |
|  +---------------+   +---------------------+   +----------------+ |
|         |                      |   ^                               |
|         |                      v   |                               |
|         |            +---------------------+                       |
|         |            |  FieldCatalogPanel   |                       |
|         |            |  (PrimeReact Sidebar)|                       |
|         |            +---------------------+                       |
|         |                      |                                   |
|         v                      v                                   |
|  +----------------------------------------------------+           |
|  |           templateStore (Zustand)                   |           |
|  |  - текущий JSON-spec                                 |           |
|  |  - выбранная ячейка / диапазон                       |           |
|  |  - мок Field Catalog                                  |           |
|  |  - мок Conclusion Data                                |           |
|  +----------------------------------------------------+           |
|         |                                                          |
|         v                                                          |
|  +----------------------------------------------------+           |
|  |   specMapper.ts  <->  IWorkbookData (Univer)         |           |
|  |   xlsxRenderer.ts (ExcelJS)                          |           |
|  +----------------------------------------------------+           |
+---------------------------------------------------------------------+
```

**Принцип, унаследованный из основной спецификации:** Univer Sheets отвечает только за визуальный редактор и preview. Генерация итогового `.xlsx` выполняется независимо через ExcelJS на основе JSON-spec — те же два слоя, что и в production-архитектуре.

---

## 4. Структура проекта

```
conclusion-constructor-mvp/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppShell.tsx              # PrimeReact Toolbar + layout
│   │   └── main.tsx
│   ├── components/
│   │   ├── editor/
│   │   │   ├── TemplateEditor.tsx     # обёртка над Univer
│   │   │   ├── useUniverInstance.ts   # хук инициализации univerAPI
│   │   │   └── EditorToolbar.tsx      # PrimeReact toolbar (merge, стиль, и т.д.)
│   │   ├── fieldCatalog/
│   │   │   ├── FieldCatalogPanel.tsx  # PrimeReact Sidebar + Tree/Accordion
│   │   │   └── FieldCatalogItem.tsx
│   │   ├── preview/
│   │   │   └── PreviewDialog.tsx      # PrimeReact Dialog + read-only Univer
│   │   ├── templates/
│   │   │   ├── TemplateListDialog.tsx # PrimeReact DataTable со списком шаблонов
│   │   │   └── NewTemplateDialog.tsx  # выбор базовой заготовки
│   │   └── common/
│   │       └── ui/                    # обёртки над PrimeReact-компонентами
│   ├── core/
│   │   ├── spec/
│   │   │   ├── types.ts               # типы JSON-spec (Cell, Region, Style...)
│   │   │   ├── specMapper.ts          # JSON-spec ↔ IWorkbookData
│   │   │   └── specValidator.ts       # Zod-схемы
│   │   ├── xlsx/
│   │   │   └── xlsxRenderer.ts        # ExcelJS-рендерер
│   │   ├── blocks/
│   │   │   └── resolveBlockRefs.ts    # раскрытие block_ref (мок)
│   │   └── mocks/
│   │       ├── fieldCatalog.mock.ts   # мок Field Catalog (FIELDS)
│   │       ├── conclusionData.mock.ts # мок данных заключения
│   │       ├── tableBlocks.mock.ts    # мок табличных блоков
│   │       └── baseTemplates.mock.ts  # мок базовых заготовок
│   ├── store/
│   │   └── templateStore.ts           # Zustand store
│   ├── styles/
│   │   └── theme.css                  # тема PrimeReact + кастомные переменные
│   └── types/
│       └── univer.d.ts                # доп. типы при необходимости
├── package.json
├── tsconfig.json
├── vite.config.ts
└── SPEC.md
```

---

## 5. Карта функций → требования из исходной статьи

| Раздел статьи | Функция MVP | Компонент |
|---|---|---|
| Создать форму / выбрать заготовку | Диалог выбора пустого шаблона или базовой заготовки | `NewTemplateDialog.tsx` |
| Настроить структуру документа | Управление листами/строками/столбцами средствами Univer Toolbar | `TemplateEditor.tsx` (нативный UI Univer) |
| Добавить ячейки / статичный текст | Ввод текста напрямую в ячейку редактора | Нативно Univer |
| Объединить ячейки | Кнопка Merge в `EditorToolbar` | `EditorToolbar.tsx` через `fRange.merge()` |
| Привязать ячейки к данным | Выбор поля в `FieldCatalogPanel` → запись в `custom.binding` | `FieldCatalogPanel.tsx` |
| Добавить таблицы | Вставка табличного региона (mock block_ref) с заголовками колонок | `EditorToolbar.tsx` через программную вставку `setValues` |
| Изменить стили | Группа кнопок (шрифт, размер, bold, align, border) | `EditorToolbar.tsx` |
| Изменить порядок элементов | Cut/Paste через стандартные команды Univer | Нативно Univer |
| Формирование JSON-spec | Кнопка «Сохранить» → `fWorkbook.save()` → `specMapper` → JSON | `templateStore.ts` |
| Загрузка JSON-spec | Кнопка «Открыть» → список шаблонов → `specMapper` → `createWorkbook()` | `TemplateListDialog.tsx` |
| Предварительный просмотр | Кнопка «Preview» → read-only инстанс Univer с подставленными mock-данными | `PreviewDialog.tsx` |
| Рендер XLSX | Кнопка «Скачать .xlsx» → `xlsxRenderer.render()` → download | `xlsxRenderer.ts` |
| Раскрытие block_ref | При Preview/рендере — подстановка mock-таблицы вместо ссылки | `resolveBlockRefs.ts` |

---

## 6. Детализация ключевых модулей

### 6.1 useUniverInstance.ts — инициализация редактора

```ts
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU'
import '@univerjs/preset-sheets-core/lib/index.css'
import { useEffect, useRef, useState } from 'react'
import type { FUniver, FWorkbook } from '@univerjs/core/facade'
import type { IWorkbookData } from '@univerjs/core'

interface UseUniverOptions {
  readOnly?: boolean
  initialData?: IWorkbookData
}

export function useUniverInstance({ readOnly = false, initialData }: UseUniverOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [univerAPI, setUniverAPI] = useState<FUniver | null>(null)
  const [workbook, setWorkbook] = useState<FWorkbook | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const { univerAPI: api } = createUniver({
      locale: LocaleType.RU_RU,
      locales: { [LocaleType.RU_RU]: mergeLocales(UniverPresetSheetsCoreRuRU) },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: !readOnly,
          toolbar: !readOnly,
          footer: !readOnly,
          contextMenu: !readOnly,
        }),
      ],
    })

    const wb = api.createWorkbook(initialData ?? {})
    setUniverAPI(api)
    setWorkbook(wb)

    return () => api.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { containerRef, univerAPI, workbook }
}
```

### 6.2 specMapper.ts — трансляция JSON-spec в IWorkbookData и обратно

```ts
import type { IWorkbookData, ICellData } from '@univerjs/core'
import type { JsonSpec, SpecCell } from './types'

const SHEET_ID = 'conclusion_sheet'

export function mapSpecToWorkbookData(spec: JsonSpec): IWorkbookData {
  const cellData: Record<number, Record<number, ICellData>> = {}
  const mergeData = []

  for (const cell of spec.cells) {
    const { row, col } = a1ToRowCol(cell.ref)
    cellData[row] ??= {}
    cellData[row][col] = {
      v: resolveDisplayValue(cell),
      custom: cell.value.binding ? { binding: cell.value.binding } : undefined,
      s: mapStyleToUniver(cell.style),
    }
    if (cell.merge) {
      mergeData.push(a1RangeToMergeRange(cell.merge))
    }
  }

  return {
    id: 'conclusion_workbook',
    sheetOrder: [SHEET_ID],
    name: 'Заключение',
    appVersion: '0.25.1',
    locale: 'ruRU' as any,
    styles: {},
    sheets: {
      [SHEET_ID]: {
        id: SHEET_ID,
        name: 'Заключение',
        rowCount: 60,
        columnCount: 43, // AQ
        cellData,
        mergeData,
      },
    },
  } as IWorkbookData
}

export function mapWorkbookDataToSpec(data: IWorkbookData): JsonSpec {
  // обратная трансляция: обходим cellData + mergeData -> JsonSpec.cells[]
  // полная реализация — в core/spec/specMapper.ts
  throw new Error('not implemented in spec excerpt')
}

function resolveDisplayValue(cell: SpecCell): string {
  if (cell.value.literal) return cell.value.literal
  if (cell.value.binding) return `[${cell.value.binding}]` // placeholder в редакторе
  if (cell.value.template) return cell.value.template
  return ''
}
```

> Полная реализация `a1ToRowCol`, `mapStyleToUniver`, `a1RangeToMergeRange` — в `core/spec/specMapper.ts`, не приводится в спецификации полностью (детали см. в `types.ts`).

### 6.3 xlsxRenderer.ts — генерация итогового файла

```ts
import ExcelJS from 'exceljs'
import type { JsonSpec, SpecCell } from '../spec/types'
import type { ConclusionData } from '../mocks/conclusionData.mock'
import { resolveBlockRefs } from '../blocks/resolveBlockRefs'
import { getByPath } from '../spec/pathUtils'

export async function renderXlsx(spec: JsonSpec, data: ConclusionData): Promise<Blob> {
  const resolvedSpec = await resolveBlockRefs(spec)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Заключение', {
    pageSetup: {
      paperSize: resolvedSpec.page.format === 'A4' ? 9 : 8,
      orientation: resolvedSpec.page.orientation,
      margins: resolvedSpec.page.margins,
    },
  })

  for (const cell of resolvedSpec.cells) {
    const xlsxCell = ws.getCell(cell.ref)
    xlsxCell.value = resolveValue(cell.value, data)
    applyStyle(xlsxCell, cell.style)
    if (cell.merge) ws.mergeCells(cell.merge)
  }

  for (const region of resolvedSpec.regions) {
    renderRegion(ws, region, data)
  }

  for (const footerCell of resolvedSpec.footer_cells ?? []) {
    renderFooterCell(ws, footerCell, data)
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function resolveValue(value: SpecCell['value'], data: ConclusionData): string {
  if (value.literal) return value.literal
  if (value.binding) return String(getByPath(data, value.binding) ?? '')
  if (value.template) {
    return value.template.replace(/\{([\w.[\]]+)\}/g, (_, path) =>
      String(getByPath(data, path) ?? ''),
    )
  }
  return ''
}
```

### 6.4 EditorToolbar.tsx — обёртка PrimeReact над Univer-командами

```tsx
import { Toolbar } from 'primereact/toolbar'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { useTemplateStore } from '../../store/templateStore'

const ALIGN_OPTIONS = [
  { label: 'По левому краю', value: 'left' },
  { label: 'По центру', value: 'center' },
  { label: 'По правому краю', value: 'right' },
]

export function EditorToolbar() {
  const { workbook } = useTemplateStore()

  const handleMerge = () => {
    workbook?.getActiveSheet().getSelection()?.getRange()?.merge()
  }

  const handleBold = () => {
    const range = workbook?.getActiveSheet().getSelection()?.getRange()
    range?.setFontWeight('bold')
  }

  const handleAlign = (align: string) => {
    const range = workbook?.getActiveSheet().getSelection()?.getRange()
    range?.setHorizontalAlignment(align as any)
  }

  return (
    <Toolbar
      start={
        <>
          <Button icon="pi pi-table" label="Объединить" onClick={handleMerge} text />
          <Button icon="pi pi-bold" onClick={handleBold} text />
          <Dropdown
            options={ALIGN_OPTIONS}
            onChange={(e) => handleAlign(e.value)}
            placeholder="Выравнивание"
          />
        </>
      }
      end={<Button icon="pi pi-eye" label="Предпросмотр" />}
    />
  )
}
```

> **Архитектурное решение:** все PrimeReact-компоненты, взаимодействующие с Univer, изолированы в `components/editor/` и `components/fieldCatalog/`. Это упрощает потенциальную замену UI-кита (PrimeReact v9 → v10/PrimeUI) без затрагивания логики работы с Univer.

### 6.5 FieldCatalogPanel.tsx — каталог полей в Sidebar

```tsx
import { Sidebar } from 'primereact/sidebar'
import { Accordion, AccordionTab } from 'primereact/accordion'
import { fieldCatalogMock } from '../../core/mocks/fieldCatalog.mock'
import { useTemplateStore } from '../../store/templateStore'

export function FieldCatalogPanel({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const { applyBindingToSelection } = useTemplateStore()

  const groups = groupByGroupName(fieldCatalogMock.scalars)

  return (
    <Sidebar visible={visible} onHide={onHide} position="right" style={{ width: '340px' }}>
      <h3>Каталог полей</h3>
      <Accordion multiple>
        {Object.entries(groups).map(([groupName, fields]) => (
          <AccordionTab key={groupName} header={groupName}>
            {fields.map((field) => (
              <div
                key={field.path}
                className="field-catalog-item"
                onClick={() => applyBindingToSelection(field.path)}
              >
                {field.title}
                <span className="field-source-badge">{field.source}</span>
              </div>
            ))}
          </AccordionTab>
        ))}
      </Accordion>
    </Sidebar>
  )
}
```

---

## 7. Моки данных (используются вместо backend)

### 7.1 fieldCatalog.mock.ts

Минимальное подмножество из Field Catalog исходной спецификации — достаточное для демонстрации всех групп (`meta`, `weld`, `quality`, `summary`) и обоих типов источников (`computed`, `manual`):

```ts
export const fieldCatalogMock = {
  scalars: [
    { path: 'meta.standard', title: 'Нормативный документ', type: 'string', source: 'computed', group_name: 'Метаданные' },
    { path: 'meta.issue_number', title: 'Номер заключения', type: 'string', source: 'manual', group_name: 'Метаданные' },
    { path: 'weld.number', title: 'Номер стыка', type: 'string', source: 'computed', group_name: 'Стык' },
    { path: 'summary.is_satisfied', title: 'Итоговое заключение', type: 'string', source: 'computed', group_name: 'Итоги' },
  ],
  tables: [
    {
      path: 'intervals', title: 'Интервалы контроля', type: 'table', source: 'computed', group_name: 'Интервалы',
      columns: [
        { path: 'intervals[].number', title: '№', type: 'int' },
        { path: 'intervals[].defects_info', title: 'Описание дефектов', type: 'string' },
        { path: 'intervals[].is_satisfied', title: 'Заключение', type: 'string' },
      ],
    },
  ],
}
```

### 7.2 conclusionData.mock.ts

Тестовый набор данных для Preview и рендера XLSX, соответствующий путям из Field Catalog (см. формат ответа `/report/conclusion/data/` из исходной спецификации).

### 7.3 tableBlocks.mock.ts

Один-два mock-блока с `item_uuid`, имитирующих `ConclusionTableBlock`, для демонстрации раскрытия `block_ref`.

### 7.4 baseTemplates.mock.ts

2–3 заранее подготовленных `IWorkbookData`-объекта («А4 портрет», «А4 альбом», «На основе ГОСТ») — имитация базовых заготовок.

---

## 8. Пользовательские сценарии MVP (Definition of Done)

| # | Сценарий | Критерий приёмки |
|---|---|---|
| 1 | Создание нового шаблона | Пользователь видит диалог выбора: «Пустой» или «На основе заготовки»; редактор открывается с соответствующим начальным состоянием |
| 2 | Редактирование ячеек | Пользователь может ввести текст, изменить шрифт/размер/выравнивание, объединить диапазон |
| 3 | Привязка к данным | Пользователь открывает каталог полей, кликает на поле — в выделенную ячейку записывается binding (видно как `[путь]` placeholder) |
| 4 | Динамическая таблица | Пользователь вставляет табличный блок (мок); в редакторе видна образцовая строка с заголовками |
| 5 | Сохранение шаблона | Кнопка «Сохранить» формирует JSON-spec (видно в DevTools/консоли или отдельном debug-просмотрщике) |
| 6 | Загрузка шаблона | Кнопка «Открыть» показывает список сохранённых (в localStorage) шаблонов, выбор загружает в редактор |
| 7 | Preview | Кнопка «Предпросмотр» открывает read-only копию редактора с подставленными mock-данными вместо binding-путей |
| 8 | Экспорт XLSX | Кнопка «Скачать .xlsx» генерирует и скачивает файл, открываемый в Excel/LibreOffice с корректными стилями и объединениями |

---

## 9. Ограничения и допущения MVP

- Хранение шаблонов — `localStorage`, без backend и без реальных API-вызовов.
- Field Catalog — статический mock-объект в коде, как и предполагает архитектура production-версии (`field_catalog.py` как константа FIELDS).
- Block_ref раскрывается из локального мок-массива, а не через HTTP-запрос.
- Авторизация, multi-tenant, история версий — вне рамок MVP.
- Динамическая таблица (`regions[]`) в MVP ограничена одной демонстрационной таблицей интервалов — без поддержки произвольного числа табличных блоков на форму.
- Drag-and-drop перемещения блоков (требование #12 из отчёта покрытия) — в MVP не реализуется; демонстрируется только Cut/Paste нативными средствами Univer.

---

## 10. План разработки MVP (укрупнённо)

| Этап | Содержание | Оценка |
|---|---|---|
| 1 | Инициализация проекта (Vite + TS + React 18 + PrimeReact + Univer), базовый layout | 1 день |
| 2 | Интеграция Univer (useUniverInstance), голый редактор без кастомизаций | 1 день |
| 3 | specMapper.ts — двусторонняя трансляция JSON-spec в IWorkbookData и обратно | 2 дня |
| 4 | EditorToolbar.tsx — стили, merge, выравнивание (PrimeReact + Univer Facade API) | 1 день |
| 5 | FieldCatalogPanel.tsx — Sidebar с каталогом полей и binding | 1 день |
| 6 | Мок-данные: Field Catalog, Conclusion Data, Table Blocks, Base Templates | 0.5 дня |
| 7 | PreviewDialog.tsx — read-only Univer с подставленными данными | 1 день |
| 8 | xlsxRenderer.ts — генерация и скачивание .xlsx через ExcelJS | 1.5 дня |
| 9 | TemplateListDialog.tsx + localStorage-персистентность | 0.5 дня |
| 10 | Полировка, тестирование сценариев из раздела 8 | 1 день |

**Итого:** ≈ 10–11 рабочих дней на одного frontend-разработчика.

---

## 11. Связанные документы

- Конструктор заключений — Архитектура и техническая концепция (исходная спецификация)
- Выбор библиотеки для визуального редактора таблиц (обоснование выбора Univer Sheets)
- Покрытие требований Univer Sheets (детальный анализ по 13 пунктам)
