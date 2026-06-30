import { useState } from 'react'
import { Menubar } from 'primereact/menubar'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { useRef } from 'react'
import type { Toast as ToastRef } from 'primereact/toast'
import { EditorToolbar } from '../components/editor/EditorToolbar'
import { TemplateEditor } from '../components/editor/TemplateEditor'
import { FieldCatalogPanel } from '../components/fieldCatalog/FieldCatalogPanel'
import { PreviewDialog } from '../components/preview/PreviewDialog'
import { NewTemplateDialog } from '../components/templates/NewTemplateDialog'
import { TemplateListDialog } from '../components/templates/TemplateListDialog'
import { useTemplateStore } from '../store/templateStore'

export function AppShell() {
  const [catalogVisible, setCatalogVisible] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [newDialogVisible, setNewDialogVisible] = useState(false)
  const [listDialogVisible, setListDialogVisible] = useState(false)

  const toast = useRef<ToastRef>(null)
  const { currentSpec, saveTemplate } = useTemplateStore()

  const handleSave = () => {
    if (!currentSpec) {
      toast.current?.show({ severity: 'warn', summary: 'Нет шаблона', detail: 'Сначала откройте или создайте шаблон.' })
      return
    }
    saveTemplate()
    toast.current?.show({ severity: 'success', summary: 'Сохранено', detail: `Шаблон «${currentSpec.name}» сохранён.` })
  }

  const menuItems = [
    {
      label: 'Файл',
      icon: 'pi pi-file',
      items: [
        { label: 'Новый шаблон', icon: 'pi pi-plus', command: () => setNewDialogVisible(true) },
        { label: 'Открыть шаблон', icon: 'pi pi-folder-open', command: () => setListDialogVisible(true) },
        { label: 'Сохранить', icon: 'pi pi-save', command: handleSave },
      ],
    },
  ]

  const menuEnd = (
    <div className="flex align-items-center gap-2">
      <Button
        label="Каталог полей"
        icon="pi pi-list"
        onClick={() => setCatalogVisible(true)}
        outlined
        size="small"
        disabled={!currentSpec}
      />
    </div>
  )

  return (
    <div className="app-shell">
      <Toast ref={toast} />

      <Menubar
        model={menuItems}
        end={menuEnd}
        style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', flexShrink: 0 }}
      />

      {currentSpec ? (
        <>
          <EditorToolbar
            onPreview={() => setPreviewVisible(true)}
            onSave={handleSave}
          />
          <div className="editor-area">
            <TemplateEditor key={currentSpec.id} />
          </div>
        </>
      ) : (
        <div className="editor-area flex flex-column align-items-center justify-content-center gap-4 text-color-secondary">
          <i className="pi pi-file-excel" style={{ fontSize: '4rem', opacity: 0.4 }} />
          <div className="text-2xl font-light">Конструктор заключений</div>
          <div className="text-sm">Создайте новый шаблон или откройте сохранённый</div>
          <div className="flex gap-3 mt-2">
            <Button label="Новый шаблон" icon="pi pi-plus" onClick={() => setNewDialogVisible(true)} />
            <Button label="Открыть шаблон" icon="pi pi-folder-open" onClick={() => setListDialogVisible(true)} outlined />
          </div>
        </div>
      )}

      <FieldCatalogPanel visible={catalogVisible} onHide={() => setCatalogVisible(false)} />
      <PreviewDialog visible={previewVisible} onHide={() => setPreviewVisible(false)} />
      <NewTemplateDialog visible={newDialogVisible} onHide={() => setNewDialogVisible(false)} />
      <TemplateListDialog visible={listDialogVisible} onHide={() => setListDialogVisible(false)} />
    </div>
  )
}
