// src/components/data-table.tsx
"use client"

import * as React from "react"

import type { ColumnDef, SortingState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconDotsVertical, IconPlus, IconUpload, IconSearch, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export type FilterConfig<T> = {
  id: string
  label: string
  options: Array<{ label: string; value: string }>
  accessor: (row: T) => string
  defaultValue?: string
}

export type DrawerConfig<T> = {
  triggerField?: keyof T
  renderTrigger?: (row: T) => React.ReactNode
  renderTitle?: (row: T) => React.ReactNode
  renderBody?: (row: T) => React.ReactNode
  renderFooter?: (row: T) => React.ReactNode
}

export type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T>[]
  getRowId?: (row: T, index: number) => string
  /** kept for API compatibility but ignored now that DnD is removed */
  drag?: { getId: (row: T) => string }
  searchable?: { placeholder?: string; fields: (keyof T)[] }
  filters?: FilterConfig<T>[]
  onAdd?: () => void
  addLabel?: string
  onImport?: () => void
  importLabel?: string
  pageSizeOptions?: number[]
  renderRowActions?: (row: T) => React.ReactNode
  drawer?: DrawerConfig<T>
  /** bulk delete handler; called after user confirms */
  onDeleteSelected?: (rows: T[]) => void
}

/* -------------------------------------------------------------------------- */
/*                             Main DataTable                                  */
/* -------------------------------------------------------------------------- */

export function DataTable<T extends Record<string, undefined>>({
  data: externalData,
  columns,
  getRowId,
  // drag (ignored),
  searchable,
  filters,
  onAdd,
  addLabel = "Add",
  onImport,
  importLabel = "Import",
  pageSizeOptions = [10, 20, 30, 40, 50],
  renderRowActions,
  // drawer,
  onDeleteSelected,
}: DataTableProps<T>) {
  const ALL_TOKEN = "__ALL__" // Radix Select can't use empty string

  // Local rows
  const [data, setData] = React.useState<T[]>(() => externalData)
  React.useEffect(() => setData(externalData), [externalData])

  // Table UI
  const [openDelete, setOpenDelete] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })

  // Debounced search (smooth typing)
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 180)
    return () => clearTimeout(t)
  }, [searchInput])

  // Filters
  const [filterSelections, setFilterSelections] = React.useState<Record<string, string>>(
    () =>
      (filters ?? []).reduce((acc, f) => {
        if (f.defaultValue) acc[f.id] = f.defaultValue
        return acc
      }, {} as Record<string, string>)
  )
  function setFilter(id: string, value: string) {
    setFilterSelections((prev) => ({ ...prev, [id]: value }))
  }

  // Faceted counts (respects other filters + search)
  const countsByFilter = React.useMemo(() => {
    if (!filters?.length) return {}
    const q = search.trim().toLowerCase()
    const afterSearch = !searchable || !q
      ? data
      : data.filter((row) =>
          searchable.fields.some((k) =>
            String(row[k] ?? "").toLowerCase().includes(q)
          )
        )
    const map: Record<string, Record<string, number>> = {}
    for (const f of filters) {
      const rows = afterSearch.filter((row) =>
        (filters ?? []).every((g) => {
          if (g.id === f.id) return true
          const selected = (filterSelections[g.id] ?? g.defaultValue) || ""
          if (!selected) return true
          return g.accessor(row) === selected
        })
      )
      const counter: Record<string, number> = {}
      for (const row of rows) {
        const v = f.accessor(row) ?? ""
        counter[v] = (counter[v] ?? 0) + 1
      }
      map[f.id] = counter
    }
    return map
  }, [data, filters, filterSelections, search, searchable])

  // Final filtered rows
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((row) => {
      const passSearch =
        !searchable || !q
          ? true
          : searchable.fields.some((k) =>
              String(row[k] ?? "").toLowerCase().includes(q)
            )
      const passFilters =
        !(filters && filters.length)
          ? true
          : filters!.every((f) => {
              const selected = (filterSelections[f.id] ?? f.defaultValue) || ""
              if (!selected) return true
              return f.accessor(row) === selected
            })
      return passSearch && passFilters
    })
  }, [data, search, filters, searchable, filterSelections])

  // Reset to first page when filters/search change
  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [search, filterSelections])

  // Columns (checkbox + user + actions)
  const composedColumns = React.useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = []

    // Select column
    cols.push({
      id: "_select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    })

    // User columns
    cols.push(...columns)

    // Actions column
    if (renderRowActions) {
      cols.push({
        id: "_actions",
        header: () => null,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              >
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {renderRowActions(row.original)}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 56,
      })
    }

    return cols
  }, [columns, renderRowActions])

  // Table uses filteredRows directly
  const table = useReactTable({
    data: filteredRows,
    columns: composedColumns,
    state: { sorting, rowSelection, pagination },
    getRowId: (row, index) => (getRowId?.(row, index) ?? String(index)),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  /* ------------------------------ Toolbar ------------------------------ */
  // Focus-preserving search helpers
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)
  const lastTypeTs = React.useRef(0)
  function restoreFocusIfRecent() {
    const el = searchInputRef.current
    if (!el) return
    if (Date.now() - lastTypeTs.current < 300) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true })
        try { el.setSelectionRange(start, end) } catch (_err) {}
      })
    }
  }

  function Toolbar() {
    return (
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* LEFT: Filters + Search */}
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-2">
            {filters?.map((f) => {
              const selected = filterSelections[f.id] ?? ""
              const counts = countsByFilter[f.id] ?? {}
              const total = filteredRows.length
              return (
                <Select
                  key={f.id}
                  value={selected ? selected : ALL_TOKEN}
                  onValueChange={(v) => setFilter(f.id, v === ALL_TOKEN ? "" : v)}
                >
                  <SelectTrigger
                    className="w-[220px]"
                    size="sm"
                    aria-label={f.label}
                  >
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value={ALL_TOKEN}>
                      Tous{typeof total === "number" ? ` (${total})` : ""}
                    </SelectItem>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label} {`(${counts[o.value] ?? 0})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            })}

            {searchable && (
              <div className="relative w-[200px] sm:w-[240px] lg:w-[280px]">
                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  className="pl-8"
                  placeholder={searchable.placeholder ?? "Search..."}
                  value={searchInput}
                  onChange={(e) => {
                    lastTypeTs.current = Date.now()
                    setSearchInput(e.target.value)
                    // if something steals focus within this frame, put it back
                    requestAnimationFrame(() => {
                      searchInputRef.current?.focus({ preventScroll: true })
                    })
                  }}
                  onBlur={restoreFocusIfRecent}
                />
              </div>
            )}
          </form>

          {/* RIGHT: Import + Delete + Add */}
          <div className="ml-auto flex items-center gap-2">
            
            {/* Delete selected */}
            {onDeleteSelected && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setOpenDelete(true)}
              >
                <IconTrash />
                <span className="hidden lg:inline">
                  Supprimer ({table.getFilteredSelectedRowModel().rows.length})
                </span>
              </Button>
            )}
            {onImport && (
              <Button variant="outline" size="sm" onClick={onImport}>
                <IconUpload />
                <span className="hidden lg:inline">{importLabel}</span>
              </Button>
            )}
            {onAdd && (
              <Button variant="default" size="sm" onClick={onAdd}>
                <IconPlus />
                <span className="hidden lg:inline">{addLabel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Optional Drawer helper (kept, unchanged)
  // function DrawerCell({ row }: { row: T }) {
  //   if (!drawer) return null
  //   const trigger =
  //     drawer.renderTrigger ??
  //     ((r: T) => <span className="text-foreground">{String(r[String(drawer.triggerField!)] ?? "")}</span>)
  //   return (
  //     <Drawer>
  //       <DrawerTrigger asChild>
  //         <Button variant="link" className="text-foreground w-fit px-0 text-left">
  //           {trigger(row)}
  //         </Button>
  //       </DrawerTrigger>
  //       <DrawerContent>
  //         <DrawerHeader className="gap-1">
  //           <DrawerTitle>
  //             {drawer.renderTitle ? drawer.renderTitle(row) : String(row[String(drawer.triggerField!)] ?? "")}
  //           </DrawerTitle>
  //         </DrawerHeader>
  //         {drawer.renderBody && <div className="px-4 py-2">{drawer.renderBody(row)}</div>}
  //         <DrawerFooter>
  //           {drawer.renderFooter ? (
  //             drawer.renderFooter(row)
  //           ) : (
  //             <DrawerClose asChild>
  //               <Button variant="outline">Close</Button>
  //             </DrawerClose>
  //           )}
  //         </DrawerFooter>
  //       </DrawerContent>
  //     </Drawer>
  //   )
  // }

  /* ---------------------------------- Render ---------------------------------- */
  return (
    <div className="w-full flex-col justify-start gap-4">
      <div className="pt-1">
        <Toolbar />
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={composedColumns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Résultat par page:
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((ps) => (
                    <SelectItem key={ps} value={`${ps}`}>
                      {ps}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la sélection ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les éléments sélectionnés seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows.map(r => r.original as T)
                setOpenDelete(false)
                onDeleteSelected?.(selectedRows)
                // Optionally clear selection after callback:
                table.resetRowSelection()
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Helper cell factories (opt)                         */
/* -------------------------------------------------------------------------- */

export function makeDrawerTriggerColumn<T>(
  field: keyof T,
  drawer: DrawerConfig<T>
): ColumnDef<T> {
  return {
    id: String(field),
    header: String(field),
    cell: ({ row }) => (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="link" className="text-foreground w-fit px-0 text-left">
            {drawer.renderTrigger
              ? drawer.renderTrigger(row.original)
              : String(row.original[field] ?? "")}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="gap-1">
            <DrawerTitle>
              {drawer.renderTitle
                ? drawer.renderTitle(row.original)
                : String(row.original[field] ?? "")}
            </DrawerTitle>
          </DrawerHeader>
          {drawer.renderBody && <div className="px-4 py-2">{drawer.renderBody(row.original)}</div>}
          <DrawerFooter>
            {drawer.renderFooter ? (
              drawer.renderFooter(row.original)
            ) : (
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    ),
    enableHiding: false,
  }
}
