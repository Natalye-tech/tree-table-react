import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_GlobalFilterTextField,
  type MRT_ExpandedState,
  type MRT_Row,
  type MRT_RowData,
  type MRT_RowSelectionState,
} from 'material-react-table';
import { MRT_Localization_RU } from 'material-react-table/locales/ru';
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';

import type { MRTTreeProps } from './components/Types';

export type {
  MRTTreeToolbarOptions,
  MRTTreeProps,
  SelectionMode,
  ContextMenuItem,
} from './components/Types';

// ────────────────────────────────────────────────────────────────────────────
// КОНСТАНТЫ
// ────────────────────────────────────────────────────────────────────────────

const TEXT_LEFT = 12;
const FILTER_ROW_EXTRA_HEIGHT = 32;
const FILTER_BOTTOM_PADDING = 4;

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_INITIAL_PAGE_SIZE = 10;

const PAGINATION_LABEL_SIZE = '0.7rem';
const PAGINATION_VALUE_SIZE = '0.9rem';
const BOTTOM_TOOLBAR_HEIGHT = 40;

const EXPAND_BASE_LEFT = 5;
const EXPAND_HEADER_EXTRA_LEFT = 5;

const TABLE_EXTRA_BORDER_RADIUS = 3;
const SEARCH_FIELD_EXTRA_BORDER_RADIUS = 4;

// ─── Размеры тулбара и поля поиска ──────────────────────────────────────────

const TOP_TOOLBAR_HEIGHT = 43;
const TOOLBAR_CONTENT_HEIGHT = 32;

const SEARCH_FIELD_MIN_WIDTH = 230;
const SEARCH_FIELD_MAX_WIDTH = 270;
const SEARCH_FIELD_HEIGHT = TOOLBAR_CONTENT_HEIGHT;

const TOOLBAR_CONTENT_OFFSET_DOWN = 14;
const TOOLBAR_CONTENT_RIGHT_OFFSET = 8;

// ─── Анимация появления дочерних строк ──────────────────────────────────────

/**
 * Длительность анимации появления дочерних строк (мс).
 * Должна совпадать с `@keyframes mrt-row-appear` в `src/index.css`.
 */
const ROW_APPEAR_ANIMATION_DURATION = 200;

const compactToolbarSx = {
  minHeight: TOP_TOOLBAR_HEIGHT,
  height: TOP_TOOLBAR_HEIGHT,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  display: 'flex',
  alignItems: 'center',
  position: 'relative' as const,
  overflow: 'visible' as const,
  '& .MuiToolbar-root': {
    minHeight: `${TOP_TOOLBAR_HEIGHT}px !important`,
    height: TOP_TOOLBAR_HEIGHT,
    paddingTop: '0 !important',
    paddingBottom: '0 !important',
    paddingLeft: '8px',
    paddingRight: '0',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  '& .MuiIconButton-root': { padding: '4px' },
  '& .MuiButton-root': {
    paddingTop: '2px',
    paddingBottom: '2px',
    minHeight: '28px',
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// ЛОКАЛЬНЫЕ ТИПЫ
// ────────────────────────────────────────────────────────────────────────────

type ContextMenuState<TData> = {
  mouseX: number;
  mouseY: number;
  row: TData;
} | null;

// ────────────────────────────────────────────────────────────────────────────
// КОМПОНЕНТ
// ────────────────────────────────────────────────────────────────────────────

export const MRTTree = <TData extends MRT_RowData,>({
  initialData,
  columns,
  getRowId,
  getSubRows,
  withSubRows,
  loadChildren,
  canExpand,
  toolbar,
  rowHeight = 34,
  headerHeight = 32,
  checkboxSize = 'small',
  indentPx = 35,
  selectionMode = 'checkbox',
  getRowBackgroundColor,
  contextMenuItems,
  manualPagination = false,
  manualFiltering = false,
  manualSorting = false,
  rowCount,
  pagination,
  onPaginationChange,
  globalFilter,
  onGlobalFilterChange,
  sorting,
  onSortingChange,
}: MRTTreeProps<TData>) => {
  const theme = useTheme();

  const headerBg =
    theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[50];

  const rowsPerPageOptions =
    toolbar?.rowsPerPageOptions ?? DEFAULT_ROWS_PER_PAGE_OPTIONS;
  const initialPageSize =
    toolbar?.initialPageSize ?? DEFAULT_INITIAL_PAGE_SIZE;

  const [data, setData] = useState<TData[]>(initialData);
  const [expanded, setExpanded] = useState<MRT_ExpandedState>({});
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [showSearch, setShowSearch] = useState<boolean>(
    toolbar?.initialShowSearch ?? false,
  );

  const [contextMenu, setContextMenu] =
    useState<ContextMenuState<TData> | null>(null);

  const prevInitialDataRef = useRef(initialData);
  useEffect(() => {
    if (prevInitialDataRef.current !== initialData) {
      prevInitialDataRef.current = initialData;
      setData(initialData);
    }
  }, [initialData]);

  const hasSelection = selectionMode !== 'none';
  const isRadio = selectionMode === 'radio';

  const contextMenuEnabled =
    Array.isArray(contextMenuItems) && contextMenuItems.length > 0;

  const effectiveHeaderHeight = showColumnFilters
    ? headerHeight + FILTER_ROW_EXTRA_HEIGHT
    : headerHeight;

  const actuallyCanExpand = (rowOriginal: TData): boolean =>
    canExpand ? canExpand(rowOriginal) : true;

  // Ленивая подгрузка детей
  useEffect(() => {
    const load = async () => {
      const expandedRecord =
        expanded === true ? {} : (expanded as Record<string, boolean>);

      const rowsToLoad: TData[] = [];

      for (const [id, isExpanded] of Object.entries(expandedRecord)) {
        if (!isExpanded) continue;
        const row = data.find((r) => getRowId(r) === id);
        if (!row) continue;
        if (getSubRows(row) !== undefined) continue;
        if (!actuallyCanExpand(row)) continue;
        rowsToLoad.push(row);
      }

      if (rowsToLoad.length === 0) return;

      setIsLoading(true);
      try {
        const updates = await Promise.all(
          rowsToLoad.map(async (row) => {
            const children = await loadChildren(row);
            return { id: getRowId(row), children };
          }),
        );
        setData((prev) =>
          prev.map((row) => {
            const update = updates.find((u) => u.id === getRowId(row));
            return update ? withSubRows(row, update.children) : row;
          }),
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, data, loadChildren]);

  useEffect(() => {
    if (!hasSelection && Object.keys(rowSelection).length > 0) {
      setRowSelection({});
      return;
    }
    if (isRadio) {
      const keys = Object.keys(rowSelection);
      if (keys.length > 1) {
        setRowSelection({ [keys[0]]: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode]);

  const cellCenterSx = (rowH: number) =>
    ({
      verticalAlign: 'middle',
      paddingTop: 0,
      paddingBottom: 0,
      height: rowH,
      '& > .MuiBox-root, & > .MuiStack-root, & > div': {
        display: 'flex',
        alignItems: 'center',
        paddingTop: 0,
        paddingBottom: 0,
        minHeight: rowH,
      },
    }) as const;

  const textHeaderCompactSx = {
    backgroundColor: headerBg,
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: `0px solid ${theme.palette.divider}`,
    borderRight: 'none',
    borderLeft: 'none',
    lineHeight: 1.2,
    paddingLeft: `${TEXT_LEFT}px`,
    paddingRight: '12px',
    ...cellCenterSx(headerHeight),
  };

  const textHeaderWithFiltersSx = {
    backgroundColor: headerBg,
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: `0px solid ${theme.palette.divider}`,
    borderRight: 'none',
    borderLeft: 'none',
    lineHeight: 1.2,
    paddingLeft: `${TEXT_LEFT}px`,
    paddingRight: '12px',
    paddingTop: 0,
    paddingBottom: `${FILTER_BOTTOM_PADDING}px`,
    verticalAlign: 'top' as const,
    minHeight: effectiveHeaderHeight,
    height: 'auto',
    '& > .MuiBox-root:first-of-type': {
      height: headerHeight,
      minHeight: headerHeight,
      display: 'flex',
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 0,
    },
    '& > .MuiBox-root:not(:first-of-type)': {
      paddingTop: 0,
      paddingBottom: 0,
    },
  };

  const compactBottomToolbarSx = {
    minHeight: BOTTOM_TOOLBAR_HEIGHT,
    height: BOTTOM_TOOLBAR_HEIGHT,
    padding: 0,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: headerBg,
    borderTop: `1px solid ${theme.palette.divider}`,
    '& .MuiToolbar-root': {
      minHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      height: BOTTOM_TOOLBAR_HEIGHT,
      paddingTop: '0 !important',
      paddingBottom: '0 !important',
      paddingLeft: '8px',
      paddingRight: '0',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box',
    },
    '& .MuiTablePagination-root': {
      display: 'flex',
      alignItems: 'center',
      minHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      height: BOTTOM_TOOLBAR_HEIGHT,
      padding: 0,
      margin: 0,
      color: theme.palette.text.secondary,
      width: '100%',
    },
    '& .MuiTablePagination-toolbar': {
      display: 'flex',
      alignItems: 'center',
      minHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      height: BOTTOM_TOOLBAR_HEIGHT,
      paddingTop: '0 !important',
      paddingBottom: '0 !important',
      paddingLeft: '0 !important',
      paddingRight: '0 !important',
      width: '100%',
    },
    '& .MuiTablePagination-selectLabel': {
      fontSize: `${PAGINATION_LABEL_SIZE} !important`,
      fontWeight: 400,
      textTransform: 'none',
      letterSpacing: 0,
      color: theme.palette.text.secondary,
      margin: 0,
      marginRight: 8,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
    },
    '& .MuiTablePagination-displayedRows': {
      fontSize: `${PAGINATION_VALUE_SIZE} !important`,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: theme.palette.text.secondary,
      margin: 0,
      marginLeft: 12,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
    },
    '& .MuiTablePagination-input': {
      display: 'inline-flex',
      alignItems: 'center',
      height: 28,
    },
    '& .MuiTablePagination-input .MuiInputBase-root': {
      height: 28,
      minHeight: 28,
      fontSize: PAGINATION_VALUE_SIZE,
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiSelect-select.MuiTablePagination-select, & .MuiTablePagination-select.MuiSelect-select':
      {
        fontSize: `${PAGINATION_VALUE_SIZE} !important`,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 6,
        paddingRight: 22,
        minHeight: 'auto',
        lineHeight: 1.2,
        display: 'flex',
        alignItems: 'center',
      },
    '& .MuiTablePagination-input .MuiSvgIcon-root': { fontSize: '1rem' },
    '& .MuiTablePagination-actions': {
      marginLeft: 8,
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiTablePagination-actions .MuiIconButton-root': {
      height: 28,
      width: 28,
      minHeight: 28,
      minWidth: 28,
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.palette.text.secondary,
    },
    '& .MuiTablePagination-actions .MuiSvgIcon-root': { fontSize: '1.25rem' },
  } as const;

  const userToolbarRender = toolbar?.renderToolbarInternalActions;
  const showSearchButton = toolbar?.showSearchButton ?? true;

  const visibleMenuItems = (row: TData | null): typeof contextMenuItems => {
    if (!row || !contextMenuItems) return [];
    return contextMenuItems.filter((item) => !item.hidden?.(row));
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const table = useMaterialReactTable({
    columns,
    data,

    localization: MRT_Localization_RU,

    enableExpanding: true,
    getRowCanExpand: (row) => actuallyCanExpand(row.original as TData),
    enableExpandAll: true,
    getRowId,
    getSubRows,
    onExpandedChange: setExpanded,

    enableRowSelection: hasSelection,
    enableSubRowSelection: false,
    enableMultiRowSelection: !isRadio,
    enableSelectAll: hasSelection && !isRadio,
    selectAllMode: 'all',

    onRowSelectionChange: (updater) => {
      setRowSelection((prev) =>
        typeof updater === 'function' ? updater(prev) : updater,
      );
    },

    positionToolbarAlertBanner: 'none',

    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableFilters: true,

    enablePagination: true,
    muiPaginationProps: {
      rowsPerPageOptions,
    },

    manualPagination,
    manualFiltering,
    manualSorting,
    rowCount: manualPagination ? rowCount ?? 0 : undefined,

    ...(onPaginationChange && { onPaginationChange }),
    ...(onGlobalFilterChange && { onGlobalFilterChange }),
    ...(onSortingChange && { onSortingChange }),

    initialState: {
      showGlobalFilter: true,
      ...(manualPagination
        ? {}
        : { pagination: { pageIndex: 0, pageSize: initialPageSize } }),
    },

    onShowColumnFiltersChange: (updater) => {
      setShowColumnFilters((prev) =>
        typeof updater === 'function' ? updater(prev) : updater,
      );
    },

    muiSelectCheckboxProps: { size: checkboxSize, sx: { padding: '2px' } },
    muiSelectAllCheckboxProps: { size: checkboxSize, sx: { padding: '2px' } },

    muiExpandButtonProps: ({ row }) => {
      const canExpandRow = actuallyCanExpand(row.original as TData);
      return {
        size: checkboxSize,
        sx: {
          padding: '2px',
          ml: `${EXPAND_BASE_LEFT + row.depth * indentPx}px`,
          '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
        },
        disabled: !canExpandRow,
      };
    },

    displayColumnDefOptions: {
      'mrt-row-expand': {
        size: indentPx * 3 + 40,
        Header: ({ table: t }) => {
          const rows = t.getRowModel().rows;
          const expandableRows = rows.filter((r) =>
            actuallyCanExpand(r.original as TData),
          );
          const anyExpanded = rows.some((r) => r.getIsExpanded());
          const disabled = expandableRows.length === 0;

          const handleClick = () => {
            if (anyExpanded) {
              t.setExpanded({});
            } else {
              const next: Record<string, boolean> = {};
              rows.forEach((r) => {
                if (actuallyCanExpand(r.original as TData)) {
                  next[r.id] = true;
                }
              });
              t.setExpanded(next);
            }
          };

          return (
            <IconButton
              size={checkboxSize}
              aria-label={anyExpanded ? 'Свернуть всё' : 'Раскрыть всё'}
              onClick={handleClick}
              disabled={disabled}
              sx={{
                padding: '2px',
                ml: `${EXPAND_BASE_LEFT + EXPAND_HEADER_EXTRA_LEFT}px`,
                mr: 'auto',
                '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
              }}
            >
              {anyExpanded ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          );
        },
      },

      'mrt-row-select': {
        header: '',
        ...(isRadio
          ? {
              Cell: ({ row }: { row: MRT_Row<TData> }) => (
                <Radio
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                  size={checkboxSize}
                  sx={{ padding: '2px' }}
                />
              ),
            }
          : {}),
      },
    },

    enableColumnResizing: true,
    columnResizeMode: 'onChange',

    muiTopToolbarProps: { sx: compactToolbarSx },
    muiBottomToolbarProps: { sx: compactBottomToolbarSx },

    ...(toolbar ?? {}),

    renderToolbarInternalActions: ({ table: t }) => {
      const userContent = userToolbarRender?.({ table: t });

      return (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: TOOLBAR_CONTENT_RIGHT_OFFSET,
            transform: `translateY(calc(-50% + ${TOOLBAR_CONTENT_OFFSET_DOWN}px))`,
            height: TOOLBAR_CONTENT_HEIGHT,
            minHeight: TOOLBAR_CONTENT_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingTop: 0,
            paddingBottom: 0,
          }}
        >
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: TOOLBAR_CONTENT_HEIGHT,
              minHeight: TOOLBAR_CONTENT_HEIGHT,
              paddingTop: 0,
              paddingBottom: 0,
              '& .MuiIconButton-root': {
                height: 28,
                width: 28,
                minHeight: 28,
                minWidth: 28,
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
              '& .MuiToggleButton-root': {
                height: 28,
                minWidth: 28,
                padding: '4px',
              },
              '& .MuiTypography-root': {
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
              },
            }}
          >
            <Collapse
              in={showSearch}
              orientation="horizontal"
              timeout={200}
              unmountOnExit
              sx={{
                height: TOOLBAR_CONTENT_HEIGHT,
                minHeight: TOOLBAR_CONTENT_HEIGHT,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  height: TOOLBAR_CONTENT_HEIGHT,
                  minHeight: TOOLBAR_CONTENT_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MRT_GlobalFilterTextField
                  table={t}
                  sx={{
                    minWidth: SEARCH_FIELD_MIN_WIDTH,
                    maxWidth: SEARCH_FIELD_MAX_WIDTH,
                    height: SEARCH_FIELD_HEIGHT,
                    '& .MuiFormControl-root, & .MuiTextField-root': {
                      height: SEARCH_FIELD_HEIGHT,
                      minHeight: SEARCH_FIELD_HEIGHT,
                      margin: 0,
                    },
                    '& .MuiInputBase-root': {
                      height: SEARCH_FIELD_HEIGHT,
                      minHeight: SEARCH_FIELD_HEIGHT,
                      fontSize: '0.75rem',
                      borderRadius: `${theme.shape.borderRadius + SEARCH_FIELD_EXTRA_BORDER_RADIUS}px`,
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '4px 8px',
                      height: SEARCH_FIELD_HEIGHT - 8,
                      borderRadius: 'inherit',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderRadius: 'inherit',
                    },
                    '& .MuiInputAdornment-root': {
                      marginRight: 0,
                      '& .MuiSvgIcon-root': { fontSize: '1rem' },
                    },
                  }}
                />
              </Box>
            </Collapse>

            {showSearchButton && (
              <Tooltip title={showSearch ? 'Скрыть поиск' : 'Поиск'} arrow>
                <IconButton
                  size="small"
                  aria-label={showSearch ? 'Скрыть поиск' : 'Показать поиск'}
                  onClick={() => setShowSearch((v) => !v)}
                >
                  {showSearch ? (
                    <SearchOffIcon fontSize="small" />
                  ) : (
                    <SearchIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {userContent}
          </Stack>
        </Box>
      );
    },

    muiTablePaperProps: {
      elevation: 1,
      sx: {
        borderRadius: `${theme.shape.borderRadius + TABLE_EXTRA_BORDER_RADIUS}px`,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
      },
    },
    muiTableProps: {
      sx: {
        borderCollapse: 'separate',
        borderSpacing: 0,
        tableLayout: 'fixed',
      },
    },

    muiTableHeadCellProps: ({ column }) => {
      const isSelect = column.id === 'mrt-row-select';
      const isExpand = column.id === 'mrt-row-expand';

      if (isSelect || isExpand) {
        if (showColumnFilters) {
          return {
            sx: {
              backgroundColor: headerBg,
              borderBottom: `0px solid ${theme.palette.divider}`,
              borderRight: 'none',
              borderLeft: 'none',
              verticalAlign: 'top' as const,
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
              ...(isExpand ? { padding: 0 } : {}),
              '& > .MuiBox-root, & > .MuiStack-root, & > div': {
                display: 'flex',
                alignItems: 'center',
                height: headerHeight,
                minHeight: headerHeight,
                paddingTop: 0,
                paddingBottom: 0,
                width: '100%',
              },
            },
          };
        }
        return {
          sx: {
            backgroundColor: headerBg,
            borderBottom: `0px solid ${theme.palette.divider}`,
            borderRight: 'none',
            borderLeft: 'none',
            ...(isExpand ? { padding: 0 } : {}),
            ...cellCenterSx(headerHeight),
          },
        };
      }

      return {
        sx: showColumnFilters ? textHeaderWithFiltersSx : textHeaderCompactSx,
      };
    },

    muiTableBodyCellProps: ({ column }) => {
      const isSelect = column.id === 'mrt-row-select';
      const isExpand = column.id === 'mrt-row-expand';

      if (isSelect) {
        return {
          sx: {
            borderBottom: `0px solid ${theme.palette.divider}`,
            borderRight: 'none',
            borderLeft: 'none',
            ...cellCenterSx(rowHeight),
          },
        };
      }

      if (isExpand) {
        return {
          sx: {
            borderBottom: `0px solid ${theme.palette.divider}`,
            borderRight: 'none',
            borderLeft: 'none',
            padding: 0,
            ...cellCenterSx(rowHeight),
            '& > .MuiBox-root, & > .MuiStack-root, & > div': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 0,
              margin: 0,
              minHeight: rowHeight,
              width: '100%',
            },
          },
        };
      }

      return {
        sx: {
          fontSize: '0.875rem',
          borderBottom: `0px solid ${theme.palette.divider}`,
          borderRight: 'none',
          borderLeft: 'none',
          lineHeight: 1.2,
          paddingLeft: `${TEXT_LEFT}px`,
          paddingRight: '12px',
          ...cellCenterSx(rowHeight),
        },
      };
    },

    // ────────────────────────────────────────────────────────────────────
    // Строка: кастомный фон + hover/selected + контекстное меню + анимация
    // ────────────────────────────────────────────────────────────────────
    muiTableBodyRowProps: ({ row }) => {
      const customBg = getRowBackgroundColor?.(row.original as TData);

      const onContextMenu = contextMenuEnabled
        ? (e: MouseEvent<HTMLTableRowElement>) => {
            const items = visibleMenuItems(row.original as TData);
            if (items.length === 0) return;
            e.preventDefault();
            setContextMenu({
              mouseX: e.clientX - 2,
              mouseY: e.clientY - 4,
              row: row.original as TData,
            });
          }
        : undefined;

      return {
        onContextMenu,
        sx: {
          height: rowHeight,
          transition: 'filter 0.15s ease',
          // ❗️ Плавное появление только для дочерних строк.
          // Корневые строки (depth = 0) появляются мгновенно при загрузке.
          ...(row.depth > 0
            ? {
                animation: `mrt-row-appear ${ROW_APPEAR_ANIMATION_DURATION}ms ease-out`,
              }
            : {}),
          ...(customBg ? { backgroundColor: customBg } : {}),
          '&:hover': customBg
            ? { filter: 'brightness(0.94)' }
            : { backgroundColor: theme.palette.action.hover },
          '&[data-selected="true"]': customBg
            ? { filter: 'brightness(0.82)' }
            : { backgroundColor: theme.palette.action.selected },
          '&:last-of-type td': {
            borderBottom: 'none',
            borderRight: 'none',
            borderLeft: 'none',
          },
        },
      };
    },

    state: {
      expanded,
      rowSelection,
      isLoading,
      showColumnFilters,
      ...(pagination !== undefined && { pagination }),
      ...(globalFilter !== undefined && { globalFilter }),
      ...(sorting !== undefined && { sorting }),
    },
  });

  const currentRow = contextMenu?.row ?? null;
  const currentItems = currentRow ? visibleMenuItems(currentRow) : [];

  return (
    <>
      <MaterialReactTable table={table} />

      {contextMenuEnabled && contextMenu !== null && currentItems.length > 0 && (
        <Menu
          open
          onClose={handleContextMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={{
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
          }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 200,
                borderRadius: `${theme.shape.borderRadius}px`,
              },
            },
          }}
        >
          {currentItems.map((item) => {
            const isDisabled = item.disabled?.(contextMenu.row) ?? false;
            return (
              <span key={item.id}>
                <MenuItem
                  disabled={isDisabled}
                  onClick={() => {
                    item.onClick(contextMenu.row);
                    handleContextMenuClose();
                  }}
                  sx={{
                    fontSize: '0.875rem',
                    color:
                      item.color && item.color !== 'inherit'
                        ? `${item.color}.main`
                        : undefined,
                  }}
                >
                  {item.icon && (
                    <ListItemIcon
                      sx={{
                        minWidth: 28,
                        color:
                          item.color && item.color !== 'inherit'
                            ? `${item.color}.main`
                            : undefined,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </MenuItem>
                {item.dividerAfter && <Divider />}
              </span>
            );
          })}
        </Menu>
      )}
    </>
  );
};

export default MRTTree;