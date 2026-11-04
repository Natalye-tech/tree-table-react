import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  createTheme,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { MRT_ColumnDef } from 'material-react-table';
import type { PaginationState, SortingState } from '@tanstack/react-table';

import { MRTTree } from '../../components/MRTTree/Tree';
import {
  createToolbarConfig,
  DENSITIES,
  type ThemeMode,
} from '../../components/MRTTree/components/ToolbarConfig';
import type { Template, TemplateTreeNode } from './TemplateTypes';
import type {
  SelectionMode,
  ContextMenuItem,
} from '../../components/MRTTree/components/Types';
import { useGetTestTableDataQuery } from './api';

// ────────────────────────────────────────────────────────────────────────────
// Статусы
// ────────────────────────────────────────────────────────────────────────────

const statusLabels: Record<number, string> = {
  1: 'Создан',
  2: 'Выполнен',
  3: 'Ошибка',
  4: 'Выполняется',
};

const STATUS_BG: Record<number, string | undefined> = {
  1: undefined,
  2: 'rgba(76, 175, 80, 0.12)',
  3: 'rgba(244, 67, 54, 0.10)',
  4: 'rgba(33, 150, 243, 0.10)',
};

// ────────────────────────────────────────────────────────────────────────────
// Type guards
// ────────────────────────────────────────────────────────────────────────────

/** Группа — если нет idTemplate (в клиентском типе у группы только idGroup/nameGroup) */
const isGroup = (row: TemplateTreeNode): boolean => !('idTemplate' in row);

/** Ребёнок — если есть idTemplate */
const isChild = (row: TemplateTreeNode): row is Template =>
  'idTemplate' in row;

// ────────────────────────────────────────────────────────────────────────────
// Колонки
// ────────────────────────────────────────────────────────────────────────────

const columns: MRT_ColumnDef<TemplateTreeNode>[] = [
  {
    id: 'nameTemplate',
    accessorFn: (row) =>
      'nameTemplate' in row ? row.nameTemplate : row.nameGroup,
    header: 'Шаблон',
    enableSorting: true,
  },
  {
    id: 'nameGroup',
    accessorFn: (row) => row.nameGroup,
    header: 'Группа',
    enableSorting: true,
  },
  {
    id: 'status',
    accessorFn: (row) => ('status' in row ? row.status : null),
    header: 'Статус',
    enableSorting: true,
    Cell: ({ row }) => {
      const r = row.original;
      if (!('status' in r) || r.status === null) return '—';
      return statusLabels[r.status] ?? String(r.status);
    },
  },
  {
    id: 'dateCreate',
    accessorFn: (row) => ('dateCreate' in row ? row.dateCreate : ''),
    header: 'Дата создания',
    enableSorting: true,
    Cell: ({ row }) => {
      const r = row.original;
      return 'dateCreate' in r ? r.dateCreate : '—';
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Хуки / утилиты
// ────────────────────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Фон строки по статусу — только для детей (у групп статуса нет) */
const getRowBackgroundColor = (row: TemplateTreeNode): string | undefined => {
  if (!isChild(row)) return undefined;
  if (row.status === null) return undefined;
  return STATUS_BG[row.status];
};

// ────────────────────────────────────────────────────────────────────────────
// Компонент
// ────────────────────────────────────────────────────────────────────────────

export const ParentPage = () => {
  const [densityIndex, setDensityIndex] = useState(1);
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>('checkbox');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const queryParams = useMemo(() => {
    const sort = sorting[0];
    return {
      size: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      sortDirection: (sort?.desc ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
      sortField: sort?.id ?? 'idGroup',
      searchTerm: debouncedSearch,
    };
  }, [pagination, sorting, debouncedSearch]);

  const {
    data: response,
    error,
    isLoading,
    refetch,
  } = useGetTestTableDataQuery(queryParams, { pollingInterval: 0 });

  const rows: TemplateTreeNode[] = response?.rows ?? [];
  const totalCount = response?.total ?? 0;

  // ────────────────────────────────────────────────────────────────────────
  // Обработчики контекстного меню (вызываются только для детей)
  // ────────────────────────────────────────────────────────────────────────

  const handleDescription = useCallback((row: TemplateTreeNode) => {
    if (!isChild(row)) return;
    window.alert(
      `Описание\n\nidTemplate: ${row.idTemplate}\nnameTemplate: ${row.nameTemplate}`,
    );
  }, []);

  const handleEdit = useCallback((row: TemplateTreeNode) => {
    if (!isChild(row)) return;
    window.alert(
      `Редактировать: "${row.nameTemplate}"\n` +
        `idTemplate = ${row.idTemplate}\n` +
        `Группа: "${row.nameGroup}" (idGroup = ${row.idGroup})\n` +
        `Статус: ${row.status !== null ? statusLabels[row.status] : '—'}\n` +
        `Дата: ${row.dateCreate}`,
    );
  }, []);

  const handleDelete = useCallback(
    async (row: TemplateTreeNode) => {
      if (!isChild(row)) return;
      if (!window.confirm(`Удалить "${row.nameTemplate}"?`)) return;
      await fetch(`/api/templates/${row.idTemplate}`, {
        method: 'DELETE',
      });
      refetch();
    },
    [refetch],
  );

  const handleCopy = useCallback((row: TemplateTreeNode) => {
    if (!isChild(row)) return;
    const text =
      `${row.idTemplate}: ${row.nameTemplate} ` +
      `(${row.nameGroup}, ${row.dateCreate})`;
    navigator.clipboard?.writeText(text);
    window.alert(`Скопировано:\n${text}`);
  }, []);

  const contextMenuItems: ContextMenuItem<TemplateTreeNode>[] = useMemo(
    () => [
      {
        id: 'description',
        label: 'Описание',
        icon: <InfoIcon fontSize="small" />,
        onClick: handleDescription,
        hidden: isGroup,
      },
      {
        id: 'edit',
        label: 'Редактировать',
        icon: <EditIcon fontSize="small" />,
        onClick: handleEdit,
        hidden: isGroup,
      },
      {
        id: 'copy',
        label: 'Копировать',
        icon: <ContentCopyIcon fontSize="small" />,
        onClick: handleCopy,
        hidden: isGroup,
        dividerAfter: true,
      },
      {
        id: 'delete',
        label: 'Удалить',
        icon: <DeleteIcon fontSize="small" />,
        onClick: handleDelete,
        color: 'error',
        hidden: isGroup,
      },
    ],
    [handleDescription, handleEdit, handleCopy, handleDelete],
  );

  // ────────────────────────────────────────────────────────────────────────
  // Стабильные функции для Tree.tsx
  // ────────────────────────────────────────────────────────────────────────

  const getRowId = useCallback(
    (row: TemplateTreeNode) =>
      isChild(row) ? String(row.idTemplate) : String(row.idGroup),
    [],
  );

  const getSubRows = useCallback(
    (row: TemplateTreeNode) => row.subRows,
    [],
  );

  const withSubRows = useCallback(
    (row: TemplateTreeNode, subRows: TemplateTreeNode[]) => ({
      ...row,
      subRows,
    }),
    [],
  );

  /**
   * ❗️ Раскрываются только группы.
   * У групп в клиентском типе нет `idTemplate`, поэтому проверяем
   * именно `isGroup`, а не `idGroup === idTemplate` (это всегда false).
   */
  const canExpand = useCallback(
    (row: TemplateTreeNode) => isGroup(row),
    [],
  );

  /** Загрузка детей группы по idGroup */
  const loadChildren = useCallback(
    async (row: TemplateTreeNode): Promise<TemplateTreeNode[]> => {
      if (!isGroup(row)) return [];
      const res = await fetch(`/api/templates/${row.idGroup}/children`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { rows: TemplateTreeNode[] };
      return json.rows;
    },
    [],
  );

  const theme = useMemo(
    () => createTheme({ palette: { mode: themeMode } }),
    [themeMode],
  );

  const density = DENSITIES[densityIndex];
  const nextDensity = DENSITIES[(densityIndex + 1) % DENSITIES.length];

  const toolbar = createToolbarConfig<TemplateTreeNode>({
    density,
    nextDensity,
    onDensityClick: () =>
      setDensityIndex((i) => (i + 1) % DENSITIES.length),
    selectionMode,
    onSelectionModeChange: setSelectionMode,
    showSelectionToggle: true,
    themeMode,
    onThemeToggle: () =>
      setThemeMode((m) => (m === 'light' ? 'dark' : 'light')),

    showFiltersButton: false,
    showSelectionCounter: true,
    showDensityButton: true,
    showThemeButton: true,
    showFullscreenButton: true,

    enableBottomToolbar: true,
    enablePagination: true,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
    initialPageSize: 10,

    enableTopToolbar: true,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    enableFilters: true,
    positionGlobalFilter: 'none',
    positionToolbarAlertBanner: 'none',
    showSearchButton: true,
    initialShowSearch: false,
  });

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Не удалось загрузить данные
          </Alert>
          <Box component="button" onClick={refetch} sx={{ p: 1 }}>
            Повторить
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Stack sx={{ p: 2 }} spacing={2}>
        {isLoading && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography variant="caption">Загрузка…</Typography>
          </Stack>
        )}

        <MRTTree<TemplateTreeNode>
          initialData={rows}
          columns={columns}
          getRowId={getRowId}
          getSubRows={getSubRows}
          withSubRows={withSubRows}
          loadChildren={loadChildren}
          canExpand={canExpand}
          toolbar={toolbar}
          rowHeight={density.rowHeight}
          headerHeight={density.headerHeight}
          checkboxSize={density.checkboxSize}
          indentPx={35}
          selectionMode={selectionMode}
          getRowBackgroundColor={getRowBackgroundColor}
          contextMenuItems={contextMenuItems}
          manualPagination
          manualFiltering
          manualSorting
          rowCount={totalCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          globalFilter={searchInput}
          onGlobalFilterChange={(updater) => {
            setSearchInput((prev) =>
              typeof updater === 'function' ? updater(prev) : updater,
            );
          }}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </Stack>
    </ThemeProvider>
  );
};

export default ParentPage;