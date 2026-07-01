import { Sidebar } from 'primereact/sidebar'
import { Accordion, AccordionTab } from 'primereact/accordion'
import { Tag } from 'primereact/tag'
import { Button } from 'primereact/button'
import { fieldCatalogMock } from '../../core/mocks/fieldCatalog.mock'
import { useTemplateStore } from '../../store/templateStore'
import type { FieldCatalogScalar } from '../../core/mocks/fieldCatalog.mock'

interface FieldCatalogPanelProps {
  visible: boolean
  onHide: () => void
}

function groupByGroupName(fields: FieldCatalogScalar[]): Record<string, FieldCatalogScalar[]> {
  return fields.reduce<Record<string, FieldCatalogScalar[]>>((acc, f) => {
    acc[f.group_name] ??= []
    acc[f.group_name].push(f)
    return acc
  }, {})
}

export function FieldCatalogPanel({ visible, onHide }: FieldCatalogPanelProps) {
  const { applyLabeledBinding, insertTableRegion, workbook } = useTemplateStore()

  const scalarGroups = groupByGroupName(fieldCatalogMock.scalars)

  return (
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      style={{ width: '340px' }}
      appendTo={document.body}
    >
      <h3 className="mt-0 mb-2">Каталог полей</h3>
      <p className="text-sm text-color-secondary mb-3">
        Кликните на поле — в выделенную ячейку запишется подпись, в соседнюю справа — привязка к данным.
      </p>

      <Accordion multiple>
        {Object.entries(scalarGroups).map(([groupName, fields]) => (
          <AccordionTab key={groupName} header={groupName}>
            {fields.map((field) => (
              <div
                key={field.path}
                className="field-catalog-item flex align-items-center justify-content-between p-2 mb-1 border-round cursor-pointer hover:surface-hover"
                onClick={() => applyLabeledBinding(field.path, field.title)}
                style={{ border: '1px solid var(--surface-border)' }}
              >
                <div>
                  <div className="font-medium text-sm">{field.title}</div>
                  <div className="text-xs text-color-secondary font-mono">{field.path}</div>
                </div>
                <Tag
                  value={field.source === 'computed' ? 'auto' : 'ручн.'}
                  severity={field.source === 'computed' ? 'success' : 'info'}
                />
              </div>
            ))}
          </AccordionTab>
        ))}

        <AccordionTab header="Таблицы">
          {fieldCatalogMock.tables.map((table) => (
            <div
              key={table.path}
              className="p-2 mb-2 border-round"
              style={{ border: '1px solid var(--surface-border)' }}
            >
              <div className="flex align-items-center justify-content-between mb-1">
                <div className="font-medium text-sm">{table.title}</div>
                <Tag value="таблица" severity="warning" />
              </div>
              <div className="text-xs text-color-secondary mb-1 font-mono">{table.path}</div>
              <div className="text-xs text-color-secondary mb-2">
                {table.columns.map((c) => c.title).join(' · ')}
              </div>
              <Button
                label="Вставить в ячейку"
                icon="pi pi-table"
                size="small"
                className="w-full"
                disabled={!workbook}
                onClick={() => {
                  insertTableRegion(table.path)
                  onHide()
                }}
              />
            </div>
          ))}
        </AccordionTab>
      </Accordion>
    </Sidebar>
  )
}
