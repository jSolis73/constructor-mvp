import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { baseTemplatesMock } from '../../core/mocks/baseTemplates.mock'
import { useTemplateStore } from '../../store/templateStore'

interface NewTemplateDialogProps {
  visible: boolean
  onHide: () => void
}

export function NewTemplateDialog({ visible, onHide }: NewTemplateDialogProps) {
  const { newTemplate } = useTemplateStore()

  const handleSelect = (id: string) => {
    newTemplate(id)
    onHide()
  }

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header="Новый шаблон"
      style={{ width: '560px' }}
      footer={<Button label="Отмена" icon="pi pi-times" onClick={onHide} outlined />}
      appendTo={document.body}
    >
      <p className="text-color-secondary mb-4">Выберите основу для нового шаблона заключения:</p>
      <div className="flex flex-column gap-3">
        {baseTemplatesMock.map((tpl) => (
          <Card
            key={tpl.id}
            className="cursor-pointer hover:surface-hover transition-colors transition-duration-200"
            style={{ border: '1px solid var(--surface-border)' }}
            onClick={() => handleSelect(tpl.id)}
          >
            <div className="flex align-items-center gap-3">
              <i className="pi pi-file text-4xl text-primary" />
              <div>
                <div className="font-semibold">{tpl.name}</div>
                <div className="text-sm text-color-secondary">{tpl.description}</div>
              </div>
              <i className="pi pi-chevron-right ml-auto text-color-secondary" />
            </div>
          </Card>
        ))}
      </div>
    </Dialog>
  )
}
