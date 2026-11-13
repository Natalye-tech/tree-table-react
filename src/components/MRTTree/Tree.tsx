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
import type { OnChangeFn } from '@tanstack/react-table';
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
  Tooltip,
  useTheme,
} from '@mui/material';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
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

const TEXT_LEFT = 16;
const FILTER_ROW_EXTRA_HEIGHT = 32;
const FILTER_BOTTOM_PADDING = 4;

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_INITIAL_PAGE_SIZE = 10;

const BOTTOM_TOOLBAR_HEIGHT = 52;
const EXPAND_BASE_LEFT = 8;
const EXPAND_HEADER_EXTRA_LEFT = 0;

const TABLE_EXTRA_BORDER_RADIUS = 3;
const SEARCH_FIELD_EXTRA_BORDER_RADIUS = 4;

const HEADER_FONT_SIZE = '0.875rem';
const CELL_FONT_SIZE = '0.875rem';
const PAGINATION_LABEL_SIZE = '0.875rem';
const PAGINATION_VALUE_SIZE = '0.875rem';

const TOP_TOOLBAR_HEIGHT = 52;
const SEARCH_FIELD_MIN_WIDTH = 160;
const SEARCH_FIELD_MAX_WIDTH = 270;
const SEARCH_FIELD_HEIGHT = 40;
const ROW_APPEAR_ANIMATION_DURATION = 200;

// ────────────────────────────────────────────────────────────────────────────
// ЛОКАЛЬНЫЕ ТИПЫ
// ────────────────────────────────────────────────────────────────────────────

type ContextMenuState<TData> = {
  mouseX: number;
  mouseY: number;
  row: TData;
} | null;

const checkExpanded = (state: MRT_ExpandedState, id: string) => {
  if (state === true) return true;
  return !!state[id];
};

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
  rowHeight = 52,
  headerHeight = 56,
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

  const expandedRef = useRef(expanded);
  const nextExpandedRef = useRef<MRT_ExpandedState>(expanded);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

  const handleExpandedChange: OnChangeFn<MRT_ExpandedState> = (updater) => {
    const currentExpanded = expandedRef.current;
    const next =
      typeof updater === 'function' ? updater(currentExpanded) : updater;
    nextExpandedRef.current = next;

    let hasCollapse = false;
    if (currentExpanded !== true) {
      for (const id of Object.keys(currentExpanded)) {
        if (currentExpanded[id] && !checkExpanded(next, id)) {
          hasCollapse = true;
          break;
        }
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (hasCollapse) {
      timerRef.current = setTimeout(() => {
        setExpanded(next);
        timerRef.current = null;
      }, ROW_APPEAR_ANIMATION_DURATION);
    } else {
      setExpanded(next);
    }
  };

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
    fontSize: HEADER_FONT_SIZE,
    borderBottom: `0px solid ${theme.palette.divider}`,
    lineHeight: 1.5,
    paddingLeft: `${TEXT_LEFT}px`,
    paddingRight: '16px',
    ...cellCenterSx(headerHeight),
  };

  const textHeaderWithFiltersSx = {
    backgroundColor: headerBg,
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: HEADER_FONT_SIZE,
    borderBottom: `0px solid ${theme.palette.divider}`,
    lineHeight: 1.5,
    paddingLeft: `${TEXT_LEFT}px`,
    paddingRight: '16px',
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

  // ❗️ Стили нижнего тулбара с защитой от переноса строк
  const compactBottomToolbarSx = {
    minHeight: BOTTOM_TOOLBAR_HEIGHT,
    height: BOTTOM_TOOLBAR_HEIGHT,
    maxHeight: BOTTOM_TOOLBAR_HEIGHT,
    padding: 0,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: headerBg,
    borderTop: `0px solid ${theme.palette.divider}`,
    flexWrap: 'nowrap',
    overflow: 'hidden', // NEW CODE (удален дубликат)
    '& .MuiToolbar-root': {
      minHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      height: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      maxHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      paddingTop: '0 !important',
      paddingBottom: '0 !important',
      paddingLeft: '8px !important',
      paddingRight: '0 !important',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box',
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiTablePagination-root': {
      display: 'flex',
      alignItems: 'center',
      minHeight: `${BOTTOM_TOOLBAR_HEIGHT}px !important`,
      height: BOTTOM_TOOLBAR_HEIGHT,
      padding: 0,
      margin: 0,
      paddingRight: '16px !important',
      width: '100%',
      // ❗️ Запрещаем перенос строк на корневом уровне
      flexWrap: 'nowrap',
      overflow: 'hidden',
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
      // ❗️ Запрещаем перенос строк внутри тулбара пагинации
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-selectLabel *': {
      fontSize: `${PAGINATION_LABEL_SIZE} !important`,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      margin: 0,
      marginRight: 8,
      lineHeight: 1.5,
      display: 'inline-flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      overflow: 'hidden',
      whiteSpace: 'nowrap', // ❗️ Текст не переносится
    },
    '& .MuiTablePagination-displayedRows, & .MuiTablePagination-displayedRows *': {
      fontSize: `${PAGINATION_VALUE_SIZE} !important`,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      margin: 0,
      marginLeft: 12,
      lineHeight: 1.5,
      display: 'inline-flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      overflow: 'hidden',
      whiteSpace: 'nowrap', // ❗️ Текст не переносится
    },
    '& .MuiTablePagination-input': {
      display: 'inline-flex',
      alignItems: 'center',
      height: 40,
    },
    '& .MuiTablePagination-input .MuiInputBase-root': {
      height: 40,
      minHeight: 40,
      fontSize: `${PAGINATION_VALUE_SIZE} !important`,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiSelect-select.MuiTablePagination-select, & .MuiTablePagination-select.MuiSelect-select, & .MuiTablePagination-select *': {
      fontSize: `${PAGINATION_VALUE_SIZE} !important`,
      fontWeight: 400,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 6,
      paddingRight: 22,
      minHeight: 'auto',
      lineHeight: 1.2,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiTablePagination-input .MuiSvgIcon-root': { fontSize: '1.25rem' },
    '& .MuiTablePagination-actions': {
      marginLeft: 8,
      display: 'flex',
      alignItems: 'center',
      // ❗️ Кнопки навигации не сжимаются и не переносятся
      flexShrink: 0,
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiTablePagination-actions .MuiIconButton-root': {
      height: 40,
      width: 40,
      minHeight: 40,
      minWidth: 40,
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.palette.text.secondary,
      flexWrap: 'nowrap',
      overflow: 'hidden',
    },
    '& .MuiTablePagination-actions .MuiSvgIcon-root': { fontSize: '1.5rem' },
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
    onExpandedChange: handleExpandedChange,

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

    muiSelectCheckboxProps: { size: checkboxSize, sx: { padding: '4px' } },
    muiSelectAllCheckboxProps: { size: checkboxSize, sx: { padding: '4px' } },

    muiExpandButtonProps: ({ row }) => {
      const canExpandRow = actuallyCanExpand(row.original as TData);
      return {
        size: checkboxSize,
        sx: {
          padding: '4px',
          ml: `${EXPAND_BASE_LEFT + row.depth * indentPx}px`,
          '& .MuiSvgIcon-root': { fontSize: '1.5rem' },
        },
        disabled: !canExpandRow,
      };
    },

    displayColumnDefOptions: {
      'mrt-row-expand': {
        size: indentPx * 3 + 40,
        enableResizing: true, // NEW CODE
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
                padding: '4px',
                ml: `${EXPAND_BASE_LEFT + EXPAND_HEADER_EXTRA_LEFT}px`,
                mr: 'auto',
                '& .MuiSvgIcon-root': { fontSize: '1.5rem' },
              }}
            >
              {anyExpanded ? (
                <KeyboardDoubleArrowUpIcon fontSize="small" />
              ) : (
                <KeyboardDoubleArrowDownIcon fontSize="small" />
              )}
            </IconButton>
          );
        },
      },

      'mrt-row-select': {
        header: '',
        enableResizing: true, // NEW CODE
        ...(isRadio
          ? {
              Cell: ({ row }: { row: MRT_Row<TData> }) => (
                <Radio
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                  size={checkboxSize}
                  sx={{ padding: '4px' }}
                />
              ),
            }
          : {}),
      },
    },

    enableColumnResizing: true,
    columnResizeMode: 'onChange',

    muiBottomToolbarProps: { sx: compactBottomToolbarSx },

    renderTopToolbar: ({ table: t }) => {
      const internalActions = userToolbarRender?.({ table: t });

      return (
        <Box
          sx={{
            height: TOP_TOOLBAR_HEIGHT,
            minHeight: TOP_TOOLBAR_HEIGHT,
            maxHeight: TOP_TOOLBAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 16px',
            gap: 1,
            background: headerBg,
            borderBottom: `0px solid ${theme.palette.divider}`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            flexWrap: 'nowrap',
          }}
        >
          <Collapse
            in={showSearch}
            orientation="horizontal"
            timeout={200}
            unmountOnExit
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                pr: 1,
              }}
            >
              <MRT_GlobalFilterTextField
                table={t}
                sx={{
                  minWidth: SEARCH_FIELD_MIN_WIDTH,
                  maxWidth: SEARCH_FIELD_MAX_WIDTH,
                  width: '100%',
                  height: SEARCH_FIELD_HEIGHT,
                  '& .MuiFormControl-root, & .MuiTextField-root': {
                    height: SEARCH_FIELD_HEIGHT,
                    minHeight: SEARCH_FIELD_HEIGHT,
                    maxHeight: SEARCH_FIELD_HEIGHT,
                    margin: 0,
                    minWidth: 0,
                  },
                  '& .MuiInputBase-root': {
                    height: SEARCH_FIELD_HEIGHT,
                    minHeight: SEARCH_FIELD_HEIGHT,
                    maxHeight: SEARCH_FIELD_HEIGHT,
                    fontSize: '0.875rem',
                    borderRadius: `${theme.shape.borderRadius + SEARCH_FIELD_EXTRA_BORDER_RADIUS}px`,
                    minWidth: 0,
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '8px 12px',
                    height: SEARCH_FIELD_HEIGHT - 16,
                    borderRadius: 'inherit',
                    minWidth: 0,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderRadius: 'inherit',
                  },
                  '& .MuiInputAdornment-root': {
                    marginRight: 0,
                    height: SEARCH_FIELD_HEIGHT,
                    maxHeight: SEARCH_FIELD_HEIGHT,
                    '& .MuiSvgIcon-root': { fontSize: '1.25rem' },
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
                sx={{
                  flexShrink: 0,
                  height: 40,
                  width: 40,
                  minHeight: 40,
                  minWidth: 40,
                  maxHeight: 40,
                }}
              >
                {showSearch ? (
                  <SearchOffIcon fontSize="small" />
                ) : (
                  <SearchIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}

          {internalActions}
        </Box>
      );
    },

    muiTablePaperProps: {
      elevation: 1,
      sx: {
        borderRadius: `${theme.shape.borderRadius + TABLE_EXTRA_BORDER_RADIUS}px`,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
      },
    },

    muiTableContainerProps: {
      sx: {
        flex: '1 1 auto',
        minHeight: 0,
        height: 'auto',
        maxHeight: 'none',
        overflow: 'auto',
      },
    },

    muiTableProps: {
      sx: {
        borderCollapse: 'separate',
        borderSpacing: 0,
        tableLayout: 'fixed',
        '& .MuiTableCell-root': {
          borderRight: 'none !important',
          borderLeft: 'none !important',
          borderBottom: 'none !important',
        },
        // NEW CODE: th не клипает абсолютно-позиционированную ручку ресайза
        '& .MuiTableCell-head': {
          overflow: 'visible !important',
          position: 'relative',
        },
        // NEW CODE: Ручка ресайза всегда видима, кликабельна и поверх контента
        '& .mrt-table-head-resize-button, & .Mui-TableHeadCell-ResizeHandle-Wrapper': {
          opacity: '1 !important',
          visibility: 'visible !important',
          display: 'block !important',
          zIndex: 4,
          pointerEvents: 'auto',
        },
        // NEW CODE: Видимый разделитель + подсветка при наведении
        '& .Mui-TableHeadCell-ResizeHandle-Divider': {
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: 'border-color 0.15s ease',
        },
        '& .Mui-TableHeadCell-ResizeHandle-Wrapper:hover .Mui-TableHeadCell-ResizeHandle-Divider, & .mrt-table-head-resize-button:hover .Mui-TableHeadCell-ResizeHandle-Divider': {
          borderRight: `2px solid ${theme.palette.primary.main}`,
        },
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
              borderRight: 'none !important',
              borderLeft: 'none !important',
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
            borderRight: 'none !important',
            borderLeft: 'none !important',
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
            borderRight: 'none !important',
            borderLeft: 'none !important',
            ...cellCenterSx(rowHeight),
          },
        };
      }

      if (isExpand) {
        return {
          sx: {
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRight: 'none !important',
            borderLeft: 'none !important',
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
          fontSize: CELL_FONT_SIZE,
          borderBottom: `0px solid ${theme.palette.divider}`,
          borderRight: 'none !important',
          borderLeft: 'none !important',
          lineHeight: 1.5,
          paddingLeft: `${TEXT_LEFT}px`,
          paddingRight: '16px',
          whiteSpace: 'nowrap', // NEW CODE: Запрет переноса строк
          overflow: 'hidden', // NEW CODE: Обрезка контента
          ...cellCenterSx(rowHeight),
        },
      };
    },

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

      const isDisappearing = (() => {
        if (!timerRef.current) return false;
        let current = row.getParentRow();
        while (current) {
          if (
            checkExpanded(expanded, current.id) &&
            !checkExpanded(nextExpandedRef.current, current.id)
          ) {
            return true;
          }
          current = current.getParentRow();
        }
        return false;
      })();

      return {
        onContextMenu,
        sx: {
          height: rowHeight,
          transition: 'filter 0.15s ease',
          ...(row.depth > 0
            ? {
                animation: isDisappearing
                  ? `mrt-row-disappear ${ROW_APPEAR_ANIMATION_DURATION}ms ease-in forwards`
                  : `mrt-row-appear ${ROW_APPEAR_ANIMATION_DURATION}ms ease-out`,
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