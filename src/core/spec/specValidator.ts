import { z } from 'zod'

const SpecStyleSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  horizontalAlign: z.enum(['left', 'center', 'right']).optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  wrapText: z.boolean().optional(),
  bgColor: z.string().optional(),
  fontColor: z.string().optional(),
  border: z
    .object({
      top: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional(),
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
  path: z.string(),
  title: z.string(),
  width: z.number().optional(),
})

const SpecRegionSchema = z.object({
  id: z.string(),
  startRef: z.string(),
  block_ref: z.string(),
  columns: z.array(SpecColumnSchema),
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
  page: SpecPageSchema,
  cells: z.array(SpecCellSchema),
  regions: z.array(SpecRegionSchema),
  footer_cells: z.array(SpecCellSchema).optional(),
})

export function validateSpec(data: unknown) {
  return JsonSpecSchema.safeParse(data)
}
