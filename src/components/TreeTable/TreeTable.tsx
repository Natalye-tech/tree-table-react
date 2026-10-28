import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type ExpandedState,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Checkbox,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EditIcon from '@mui/icons-material/Edit';

interface RowData {
  id: string;
  name: string;
  size: string;
  subRows?: RowData[];
  width?: string | number;
  maxWidth?: string | number;
}

const columnHelper = createColumnHelper<RowData>();

const columns = [

  // === 1. КОЛОНКА С ЧЕKБОКСАМИ (Фикс 50px) ===
  columnHelper.display({
    id: 'selection',
    header: ({ table }) => (
      <div style={{ paddingLeft: 0 }}>
        <Checkbox
          size="small"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div style={{ paddingLeft: 0 }}>
        <Checkbox 
          size="small"
          checked={row.getIsSelected()} 
          // Это делает чекбокс кликабельным для выбора строки
          onChange={() => row.toggleSelected()} 
        />
      </div>
    ),
    enableResizing: false,
    enableSorting: false,
    enableHiding: false,
  }),

  // === 2. КОЛОНКА "НАЗВАНИЕ" ===
  columnHelper.accessor('name', {
    header: 'Название',
    cell: (info) => {
      const row = info.row;
      const indent = row.depth * 24;
      const rotate = row.getIsExpanded() ? 180 : 0;

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px`, height: '40px' }}>
          {row.getCanExpand() ? (
            <ExpandMoreIcon
              sx={{
                mr: 1,
                fontSize: 20,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'transform 0.2s ease-in-out',
                transform: `rotate(${rotate}deg)`,
              }}
              onClick={row.getToggleExpandedHandler()}
            />
          ) : (
            <Box sx={{ width: 24, mr: 1 }} />
          )}
          {info.renderValue() as string}
        </Box>
      );
    },
  }),

  // === 3. КОЛОНКА "РАЗМЕР" ===
  columnHelper.accessor('size', {
    header: 'Размер',
    cell: (info) => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${info.row.depth * 24}px`,
          padding: '8px 0',
        }}
      >
        {info.renderValue() as string}
      </Box>
    ),
  }),

  // === 4. КОЛОНКА "ДЕЙСТВИЯ" ===
  columnHelper.display({
    id: 'actions',
    header: 'Действия',
    cell: (info) => (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
        <Tooltip title="Редактировать">
          <IconButton size="small" onClick={() => alert(`Редактирование: ${info.row.original.name}`)} color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  }),
];

// === КОМПОНЕНТ ТАБЛИЦЫ ===
interface TreeTableProps {
  data: RowData[];
}

const TreeTable: React.FC<TreeTableProps> = ({ data }) => {
  // 1. Состояние выбора строк (перенесено внутрь)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 2. Состояние для дерева и сортировки
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
      rowSelection,
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,

    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    
    enableExpanding: true,
    getSubRows: (row: RowData) => row.subRows,
  });

  return (
    <Paper sx={{ width: '100%', overflowX: 'auto', mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.300' }}>
      <Table size="small">
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                console.log(' ==== header ', header);
                return (
                <TableCell
                  key={header.id}
                  colSpan={header.colSpan}
                  align="left"
                  sx={{
                    maxWidth: header && header?.id === 'selection' ? '0px' : '250px',
                    width: header && header?.id === 'selection' ? '0px' : '250px',
                    backgroundColor: 'grey.100',
                    fontWeight: '600',
                    py: 0.5,
                    px: 1,
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (
                      header.column.getIsSorted() === 'desc' ? (
                        <KeyboardArrowDownIcon sx={{ fontSize: 16, ml: 0.5 }} />
                      ) : (
                        <KeyboardArrowUpIcon sx={{ fontSize: 16, ml: 0.5 }} />
                      )
                    ) : (
                      <Box sx={{ width: 16, height: 16, ml: 0.5 }} />
                    )}
                  </Box>
                </TableCell>
              )
              })}
            </TableRow>
          ))}
        </TableHead>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} hover>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} align="left" sx={{ py: 0, px: 1 }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Отладочная информация */}
      <Box p={2}>
        <small>
          Выбрано строк: {Object.keys(rowSelection).length}
        </small>
      </Box>
    </Paper>
  );
};

export default TreeTable;