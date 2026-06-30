import { Dialog } from 'primereact/dialog'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useTemplateStore, type SavedTemplate } from '../../store/templateStore'

interface TemplateListDialogProps {
  visible: boolean
  onHide: () => void
}

export function TemplateListDialog({ visible, onHide }: TemplateListDialogProps) {
  const { savedTemplates, loadTemplate, deleteTemplate } = useTemplateStore()

  const handleLoad = (id: string) => {
    loadTemplate(id)
    onHide()
  }

  const handleDelete = (id: string, name: string) => {
    confirmDialog({
      message: `Удалить шаблон «${name}»?`,
      header: 'Подтверждение',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteTemplate(id),
    })
  }

  const actionsTemplate = (row: SavedTemplate) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-folder-open"
        label="Открыть"
        onClick={() => handleLoad(row.id)}
        size="small"
      />
      <Button
        icon="pi pi-trash"
        onClick={() => handleDelete(row.id, row.name)}
        size="small"
        severity="danger"
        outlined
      />
    </div>
  )

  const dateTemplate = (row: SavedTemplate) =>
    new Date(row.savedAt).toLocaleString('ru-RU')

  return (
    <>
      <ConfirmDialog appendTo={document.body} />
      <Dialog
        visible={visible}
        onHide={onHide}
        header="Сохранённые шаблоны"
        style={{ width: '700px' }}
        footer={<Button label="Закрыть" icon="pi pi-times" onClick={onHide} outlined />}
        appendTo={document.body}
      >
        {savedTemplates.length === 0 ? (
          <div className="text-center text-color-secondary py-5">
            <i className="pi pi-inbox text-5xl mb-3 block" />
            Нет сохранённых шаблонов.
          </div>
        ) : (
          <DataTable value={savedTemplates} stripedRows size="small">
            <Column field="name" header="Название" style={{ width: '40%' }} />
            <Column header="Сохранён" body={dateTemplate} style={{ width: '30%' }} />
            <Column header="Действия" body={actionsTemplate} style={{ width: '30%' }} />
          </DataTable>
        )}
      </Dialog>
    </>
  )
}
