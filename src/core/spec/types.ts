export interface SpecStyle {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  fontFamily?: string
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  wrapText?: boolean
  bgColor?: string
  fontColor?: string
  border?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
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
  path: string
  title: string
  width?: number
}

export interface SpecRegion {
  id: string
  startRef: string
  block_ref: string
  columns: SpecColumn[]
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
  page: SpecPage
  cells: SpecCell[]
  regions: SpecRegion[]
  footer_cells?: SpecCell[]
}
