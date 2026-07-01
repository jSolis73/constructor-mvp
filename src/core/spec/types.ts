export type BorderStyle = 'none' | 'thin' | 'medium' | 'thick'

export interface SpecStyle {
  // Font
  font?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  // Alignment
  align?: 'left' | 'center' | 'right'
  vertical_align?: 'top' | 'middle' | 'bottom'
  // Borders
  border?: BorderStyle | 'all'
  border_top?: BorderStyle
  border_bottom?: BorderStyle
  border_left?: BorderStyle
  border_right?: BorderStyle
  // Layout
  wrap?: boolean
  width?: number
  height?: number
}

export interface SpecCellValue {
  literal?: string
  binding?: string
  template?: string
}

export interface SpecCell {
  ref: string
  merge?: string
  value: SpecCellValue
  style?: SpecStyle
}

export interface SpecColumn {
  header: string
  binding: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: SpecStyle
  merge_rows?: boolean
}

export interface SpecRegion {
  id?: string
  anchor: string
  block_ref?: string
  type?: 'table' | 'field'
  binding?: string
  label?: string
  columns?: SpecColumn[]
  style?: SpecStyle
}

export interface FooterCell {
  after_region?: string
  offset_rows?: number
  ref: string
  merge?: string
  value: SpecCellValue
  style?: SpecStyle
}

export interface SpecPage {
  format: 'A4' | 'A3'
  orientation: 'portrait' | 'landscape'
  margins: {
    left: number
    right: number
    top: number
    bottom: number
  }
}

export interface JsonSpec {
  id: string
  name: string
  version: number
  page: SpecPage
  cells: SpecCell[]
  regions: SpecRegion[]
  footer_cells: FooterCell[]
}
