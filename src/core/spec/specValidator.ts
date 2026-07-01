import { z } from 'zod'

const BorderStyleSchema = z.enum(['none', 'thin', 'medium', 'thick'])

const SpecStyleSchema = z.object({
  font: z.string().optional(),
  size: z.number().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  vertical_align: z.enum(['top', 'middle', 'bottom']).optional(),
  border: z.union([BorderStyleSchema, z.literal('all')]).optional(),
  border_top: BorderStyleSchema.optional(),
  border_bottom: BorderStyleSchema.optional(),
  border_left: BorderStyleSchema.optional(),
  border_right: BorderStyleSchema.optional(),
  wrap: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const SpecCellValueSchema = z.object({
  literal: z.string().optional(),
  binding: z.string().optional(),
  template: z.string().optional(),
})

const SpecCellSchema = z.object({
  ref: z.string(),
  merge: z.string().optional(),
  value: SpecCellValueSchema,
  style: SpecStyleSchema.optional(),
})

const SpecColumnSchema = z.object({
  header: z.string(),
  binding: z.string(),
  width: z.number().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  style: SpecStyleSchema.optional(),
  merge_rows: z.boolean().optional(),
})

const SpecRegionSchema = z.object({
  id: z.string().optional(),
  anchor: z.string(),
  block_ref: z.string().optional(),
  type: z.enum(['table', 'field']).optional(),
  binding: z.string().optional(),
  label: z.string().optional(),
  columns: z.array(SpecColumnSchema).optional(),
  style: SpecStyleSchema.optional(),
})

const FooterCellSchema = z.object({
  after_region: z.string().optional(),
  offset_rows: z.number().optional(),
  ref: z.string(),
  merge: z.string().optional(),
  value: SpecCellValueSchema,
  style: SpecStyleSchema.optional(),
})

const SpecPageSchema = z.object({
  format: z.enum(['A4', 'A3']),
  orientation: z.enum(['portrait', 'landscape']),
  margins: z.object({
    left: z.number(),
    right: z.number(),
    top: z.number(),
    bottom: z.number(),
  }),
})

export const JsonSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  page: SpecPageSchema,
  cells: z.array(SpecCellSchema),
  regions: z.array(SpecRegionSchema),
  footer_cells: z.array(FooterCellSchema),
})

export function validateSpec(data: unknown) {
  return JsonSpecSchema.safeParse(data)
}
