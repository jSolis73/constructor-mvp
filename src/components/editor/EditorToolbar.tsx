import { Toolbar } from 'primereact/toolbar'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Divider } from 'primereact/divider'
import { useTemplateStore } from '../../store/templateStore'
import { fieldCatalogMock } from '../../core/mocks/fieldCatalog.mock'

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((s) => ({ label: String(s), value: s }))

const ALIGN_OPTIONS = [
  { label: 'По левому краю', value: 'left', icon: 'pi pi-align-left' },
  { label: 'По центру', value: 'center', icon: 'pi pi-align-center' },
  { label: 'По правому краю', value: 'right', icon: 'pi pi-align-right' },
]

const TABLE_OPTIONS = fieldCatalogMock.tables.map((t) => ({
  label: t.title,
  value: t.path,
}))

interface EditorToolbarProps {
  onPreview: () => void
  onSave: () => void
}

export function EditorToolbar({ onPreview, onSave }: EditorToolbarProps) {
  const { workbook, insertTableRegion } = useTemplateStore()

  const getRange = () => {
    try {
      return workbook?.getActiveSheet()?.getSelection()?.getActiveRange() ?? null
    } catch {
      return null
    }
  }

  const handleMerge = () => getRange()?.merge()
  const handleUnmerge = () => getRange()?.breakApart()
  const handleBold = () => getRange()?.setFontWeight('bold')
  const handleItalic = () => getRange()?.setFontStyle('italic')
  const handleWrap = () => getRange()?.setWrap(true)

  const handleFontSize = (size: number) => getRange()?.setFontSize(size)
  const handleAlign = (align: string) => {
    const facadeAlign = align === 'right' ? 'normal' : (align as 'left' | 'center' | 'normal')
    getRange()?.setHorizontalAlignment(facadeAlign)
  }

  const handleInsertTable = (blockRef: string) => {
    if (blockRef) insertTableRegion(blockRef)
  }

  const startContent = (
    <div className="flex align-items-center gap-1 flex-wrap">
      <Button label="B" onClick={handleBold} text rounded tooltip="Жирный" tooltipOptions={{ position: 'bottom' }} style={{ fontWeight: 'bold', fontFamily: 'Georgia, serif', minWidth: '2rem' }} />
      <Button label="I" onClick={handleItalic} text rounded tooltip="Курсив" tooltipOptions={{ position: 'bottom' }} style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', minWidth: '2rem' }} />

      <Divider layout="vertical" className="mx-1" />

      <Dropdown
        options={FONT_SIZES}
        onChange={(e) => handleFontSize(e.value as number)}
        placeholder="Размер"
        style={{ width: '90px' }}
      />

      <Divider layout="vertical" className="mx-1" />

      <Dropdown
        options={ALIGN_OPTIONS}
        onChange={(e) => handleAlign(e.value as string)}
        placeholder="Выравнивание"
        optionLabel="label"
        style={{ width: '160px' }}
        itemTemplate={(opt: { icon: string; label: string }) => (
          <span>
            <i className={`${opt.icon} mr-2`} />
            {opt.label}
          </span>
        )}
      />

      <Divider layout="vertical" className="mx-1" />

      <Button label="Объединить" icon="pi pi-table" onClick={handleMerge} text />
      <Button label="Разъединить" icon="pi pi-th-large" onClick={handleUnmerge} text />
      <Button icon="pi pi-align-justify" onClick={handleWrap} text rounded tooltip="Перенос текста" tooltipOptions={{ position: 'bottom' }} />

      <Divider layout="vertical" className="mx-1" />

      <Dropdown
        options={TABLE_OPTIONS}
        onChange={(e) => handleInsertTable(e.value as string)}
        placeholder="Вставить таблицу"
        style={{ width: '180px' }}
      />
    </div>
  )

  const endContent = (
    <div className="flex gap-2">
      <Button label="Сохранить" icon="pi pi-save" onClick={onSave} outlined />
      <Button label="Предпросмотр" icon="pi pi-eye" onClick={onPreview} />
    </div>
  )

  return <Toolbar start={startContent} end={endContent} style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--surface-border)' }} />
}
