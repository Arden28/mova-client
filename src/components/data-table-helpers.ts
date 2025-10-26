// src/components/data-table-helpers.ts
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { DrawerConfig } from "./data-table" // type-only import is fine in Vite

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

const h = React.createElement

/**
 * Non-JSX helper in a .ts file to avoid:
 * - JSX parsing errors in .ts
 * - react-refresh/only-export-components in client files
 */
export function makeDrawerTriggerColumn<T>(
  field: keyof T,
  drawer: DrawerConfig<T>
): ColumnDef<T> {
  return {
    id: String(field),
    header: String(field),
    cell: ({ row }) => {
      const titleText =
        drawer.renderTitle
          ? drawer.renderTitle(row.original)
          : String((row.original as any)[field] ?? "")

      const triggerChild = h(
        Button,
        { variant: "link", className: "text-foreground w-fit px-0 text-left" },
        drawer.renderTrigger
          ? drawer.renderTrigger(row.original)
          : String((row.original as any)[field] ?? "")
      )

      const body =
        drawer.renderBody
          ? h("div", { className: "px-4 py-2" }, drawer.renderBody(row.original))
          : null

      const footer = drawer.renderFooter
        ? drawer.renderFooter(row.original)
        : h(
            DrawerClose,
            { asChild: true },
            h(Button, { variant: "outline" }, "Close")
          )

      return h(
        Drawer,
        null,
        h(DrawerTrigger as any, { asChild: true }, triggerChild),
        h(
          DrawerContent,
          null,
          h(
            DrawerHeader,
            { className: "gap-1" },
            h(DrawerTitle, null, titleText)
          ),
          body,
          h(DrawerFooter, null, footer)
        )
      )
    },
    enableHiding: false,
  }
}
