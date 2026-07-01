import { useState, useRef } from 'react'
import { Menubar } from 'primereact/menubar'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentSpec, specEpoch, saveTemplate, exportSpecJson, importSpecJson } = useTemplateStore()

  const handleExportJson = () => {
    if (!currentSpec) {
      toast.current?.show({ severity: 'warn', summary: 'Нет шаблона', detail: 'Сначала откройте или создайте шаблон.' })
      return
    }
    exportSpecJson()
    toast.current?.show({ severity: 'success', summary: 'Экспортировано', detail: 'JSON-spec скачан.' })
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        const result = importSpecJson(json)
        if (result.ok) {
          toast.current?.show({ severity: 'success', summary: 'Импортировано', detail: 'JSON-spec загружен.' })
        } else {
          toast.current?.show({ severity: 'error', summary: 'Ошибка валидации', detail: result.error, life: 8000 })
        }
      } catch {
        toast.current?.show({ severity: 'error', summary: 'Ошибка', detail: 'Невалидный JSON-файл.' })
      }
      // Reset so same file can be imported again
      e.target.value = ''
    }
    reader.readAsText(file)
  }

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
        { separator: true },
        { label: 'Экспорт JSON-spec', icon: 'pi pi-download', command: handleExportJson },
        { label: 'Импорт JSON-spec', icon: 'pi pi-upload', command: () => fileInputRef.current?.click() },
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

      <div className="app-menubar">
        <Menubar
          model={menuItems}
          end={menuEnd}
          style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}
        />
      </div>

      {currentSpec ? (
        <>
          <EditorToolbar
            onPreview={() => setPreviewVisible(true)}
            onSave={handleSave}
          />
          <div className="editor-area">
            <TemplateEditor key={`${currentSpec.id}_${specEpoch}`} />
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportJson}
      />
    </div>
  )
}
