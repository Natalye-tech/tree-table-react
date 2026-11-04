import type { ReactNode } from 'react';
import type {
  MRT_ColumnDef,
  MRT_RowData,
  MRT_TableInstance,
  MRT_TableOptions,
} from 'material-react-table';
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';

/**
 * Режим выделения строк:
 * - `'checkbox'` — множественное выделение через чекбоксы;
 * - `'radio'` — одиночное выделение через радиокнопки;
 * - `'none'` — колонка выделения полностью отсутствует.
 */
export type SelectionMode = 'checkbox' | 'radio' | 'none';

/**
 * Один пункт контекстного меню строки.
 * Задаётся в `ParentPage` и передаётся в `<MRTTree contextMenuItems={...}>`.
 */
export type ContextMenuItem<TData extends MRT_RowData> = {
  /** Уникальный ключ (для React key и идентификации) */
  id: string;

  /** Подпись пункта меню */
  label: string;

  /** Иконка (любой MUI-икон или свой SVG) */
  icon?: ReactNode;

  /** Обработчик клика. Получает строку, на которой открыли меню */
  onClick: (row: TData) => void;

  /**
   * Пункт отключён для этой строки.
   * Пример: `(row) => row.id === 1` — нельзя редактировать корень.
   */
  disabled?: (row: TData) => boolean;

  /**
   * Скрыть пункт для этой строки.
   * Пример: `(row) => !row.hasChildren` — удаление только у листьев.
   */
  hidden?: (row: TData) => boolean;

  /**
   * Цвет пункта (для акцента, например `'error'` для «Удалить»).
   * @default 'inherit'
   */
  color?:
    | 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning';

  /** Показать разделитель после этого пункта (вместо следующего) */
  dividerAfter?: boolean;
};

/**
 * Все настройки тулбара, доступные через prop `toolbar` компонента `MRTTree`.
 */
export type MRTTreeToolbarOptions<TData extends MRT_RowData> = {
  // ────────────────────────────────────────────────────────────────────────
  // Видимость тулбаров
  // ────────────────────────────────────────────────────────────────────────
  enableTopToolbar?: boolean;
  enableBottomToolbar?: boolean;

  // ────────────────────────────────────────────────────────────────────────
  // Встроенные внутренние экшены MRT
  // ────────────────────────────────────────────────────────────────────────
  enableDensityToggle?: boolean;
  enableFullScreenToggle?: boolean;
  enableColumnVisibility?: boolean;
  enableHiding?: boolean;

  // ────────────────────────────────────────────────────────────────────────
  // Поиск и фильтрация
  // ────────────────────────────────────────────────────────────────────────
  enableGlobalFilter?: boolean;
  enableColumnFilters?: boolean;
  enableFilters?: boolean;
  enableGlobalFilterModes?: boolean;

  // ────────────────────────────────────────────────────────────────────────
  // Пагинация
  // ────────────────────────────────────────────────────────────────────────
  enablePagination?: boolean;
  rowsPerPageOptions?: number[];
  initialPageSize?: number;

  // ────────────────────────────────────────────────────────────────────────
  // Расположение элементов
  // ────────────────────────────────────────────────────────────────────────
  positionToolbarAlertBanner?: 'head-overlay' | 'bottom' | 'none';
  positionGlobalFilter?: 'left' | 'right' | 'none';

  // ────────────────────────────────────────────────────────────────────────
  // Поиск
  // ────────────────────────────────────────────────────────────────────────
  showSearchButton?: boolean;
  initialShowSearch?: boolean;
  showSelectionToggle?: boolean;

  // ────────────────────────────────────────────────────────────────────────
  // Видимость отдельных элементов правой панели
  // ────────────────────────────────────────────────────────────────────────
  showFiltersButton?: boolean;
  showSelectionCounter?: boolean;
  showDensityButton?: boolean;
  showThemeButton?: boolean;
  showFullscreenButton?: boolean;

  // ────────────────────────────────────────────────────────────────────────
  // Кастомный рендер
  // ────────────────────────────────────────────────────────────────────────
  renderTopToolbarCustomActions?: (props: {
    table: MRT_TableInstance<TData>;
  }) => ReactNode;
  renderToolbarInternalActions?: (props: {
    table: MRT_TableInstance<TData>;
  }) => ReactNode;
  renderBottomToolbarCustomActions?: (props: {
    table: MRT_TableInstance<TData>;
  }) => ReactNode;
  renderTopToolbar?: (props: {
    table: MRT_TableInstance<TData>;
  }) => ReactNode;
  renderBottomToolbar?: (props: {
    table: MRT_TableInstance<TData>;
  }) => ReactNode;

  // ────────────────────────────────────────────────────────────────────────
  // Стили контейнеров
  // ────────────────────────────────────────────────────────────────────────
  muiTopToolbarProps?: MRT_TableOptions<TData>['muiTopToolbarProps'];
  muiBottomToolbarProps?: MRT_TableOptions<TData>['muiBottomToolbarProps'];
};

/**
 * Props компонента `MRTTree`.
 */
export type MRTTreeProps<TData extends MRT_RowData> = {
  // ─── Данные и колонки ─────────────────────────────────────────────────
  initialData: TData[];
  columns: MRT_ColumnDef<TData>[];

  // ─── Структурные функции ──────────────────────────────────────────────
  getRowId: (row: TData) => string;
  getSubRows: (row: TData) => TData[] | undefined;
  withSubRows: (row: TData, subRows: TData[]) => TData;
  loadChildren: (row: TData) => Promise<TData[]>;
  canExpand?: (row: TData) => boolean;

  // ─── Прочее ───────────────────────────────────────────────────────────
  toolbar?: MRTTreeToolbarOptions<TData>;
  rowHeight?: number;
  headerHeight?: number;
  checkboxSize?: 'small' | 'medium';
  indentPx?: number;
  selectionMode?: SelectionMode;
  getRowBackgroundColor?: (row: TData) => string | undefined;

  // ─────────────────────────────────────────────────────────────────────
  // ❗️ Контекстное меню строки (правый клик) — ОПЦИОНАЛЬНО
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Пункты контекстного меню, открывающегося по правому клику на строке.
   *
   * - Если массив не передан или пуст → меню **не появляется**, правый клик
   *   работает как обычно (браузерное меню).
   * - Пункты можно скрывать/отключать для отдельных строк через `hidden`
   *   и `disabled`.
   * - Если после применения `hidden` для конкретной строки не остаётся
   *   ни одного пункта — меню для неё не открывается.
   *
   * Пример:
   * ```tsx
   * contextMenuItems={[
   *   { id: 'edit', label: 'Редактировать', icon: <EditIcon />, onClick: handleEdit },
   *   { id: 'delete', label: 'Удалить', icon: <DeleteIcon />, color: 'error', onClick: handleDelete },
   * ]}
   * ```
   */
  contextMenuItems?: ContextMenuItem<TData>[];

  // ─────────────────────────────────────────────────────────────────────
  // Серверный режим
  // ─────────────────────────────────────────────────────────────────────
  manualPagination?: boolean;
  manualFiltering?: boolean;
  manualSorting?: boolean;
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
};