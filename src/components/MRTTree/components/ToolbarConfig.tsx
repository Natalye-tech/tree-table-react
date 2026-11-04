import {
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensityLargeIcon from '@mui/icons-material/DensityLarge';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import BlockIcon from '@mui/icons-material/Block';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import {
  MRT_ToggleFiltersButton,
  type MRT_RowData,
  type MRT_TableInstance,
} from 'material-react-table';
import type { MRTTreeToolbarOptions, SelectionMode } from './Types';

// ────────────────────────────────────────────────────────────────────────────
// Плотности
// ────────────────────────────────────────────────────────────────────────────

export type Density = {
  key: 'compact' | 'normal' | 'comfortable';
  label: string;
  Icon: typeof DensitySmallIcon;
  rowHeight: number;
  headerHeight: number;
  checkboxSize: 'small' | 'medium';
};

/**
 * Доступные режимы плотности.
 *
 * ❗️ rowHeight увеличен на 2px в каждом режиме:
 *    compact:     28 → 30
 *    normal:      34 → 36
 *    comfortable: 48 → 50
 *
 * headerHeight оставлен без изменений. Центрирование по вертикали
 * обеспечивается через cellCenterSx в Tree.tsx (flex + alignItems: center
 * + minHeight: rowHeight), поэтому контент всегда по центру.
 */
export const DENSITIES: readonly Density[] = [
  {
    key: 'compact',
    label: 'Компактно',
    Icon: DensitySmallIcon,
    rowHeight: 30,
    headerHeight: 28,
    checkboxSize: 'small',
  },
  {
    key: 'normal',
    label: 'Обычно',
    Icon: DensityMediumIcon,
    rowHeight: 36,
    headerHeight: 32,
    checkboxSize: 'small',
  },
  {
    key: 'comfortable',
    label: 'Просторно',
    Icon: DensityLargeIcon,
    rowHeight: 50,
    headerHeight: 40,
    checkboxSize: 'medium',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Конфиг тулбара
// ────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

/**
 * Аргументы для `createToolbarConfig`.
 *
 * Можно переопределять ЛЮБУЮ опцию `MRTTreeToolbarOptions` напрямую,
 * включая пагинацию: `enablePagination`, `rowsPerPageOptions`, `initialPageSize`.
 */
export type ToolbarConfigOptions<TData extends MRT_RowData> =
  Partial<MRTTreeToolbarOptions<TData>> & {
    density: Density;
    nextDensity: Density;
    onDensityClick: () => void;
    selectionMode: SelectionMode;
    onSelectionModeChange: (mode: SelectionMode) => void;
    showSelectionToggle: boolean;
    themeMode: ThemeMode;
    onThemeToggle: () => void;
  };

export function createToolbarConfig<TData extends MRT_RowData>(
  options: ToolbarConfigOptions<TData>,
): MRTTreeToolbarOptions<TData> {
  const {
    density,
    nextDensity,
    onDensityClick,
    selectionMode,
    onSelectionModeChange,
    showSelectionToggle,
    themeMode,
    onThemeToggle,
    // Флаги видимости отдельных элементов (дефолт true)
    showFiltersButton = true,
    showSelectionCounter = true,
    showDensityButton = true,
    showThemeButton = true,
    showFullscreenButton = true,
    // Всё остальное (enableTopToolbar, enablePagination, ...)
    ...overrides
  } = options;

  const defaultRender = ({
    table,
  }: {
    table: MRT_TableInstance<TData>;
  }) => {
    const isFullScreen = table.getState().isFullScreen;

    const selection = table.getState().rowSelection;
    const selectedCount = Object.keys(selection).length;
    const totalCount = table.getRowModel().flatRows.length;
    const hasRows = table.getRowModel().rows.length > 0;

    return (
      <>
        {showFiltersButton && <MRT_ToggleFiltersButton table={table} />}

        {showSelectionCounter && selectionMode !== 'none' && hasRows && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              mx: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {selectedCount > 0
              ? `Выбрано: ${selectedCount} из ${totalCount}`
              : 'Ничего не выбрано'}
          </Typography>
        )}

        {showSelectionToggle && hasRows && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={selectionMode}
            onChange={(_, value: SelectionMode | null) => {
              if (value !== null) onSelectionModeChange(value);
            }}
          >
            <ToggleButton value="checkbox" aria-label="Чекбоксы">
              <Tooltip title="Чекбоксы (множественный выбор)" arrow>
                <CheckBoxIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="radio" aria-label="Радиокнопки">
              <Tooltip title="Радиокнопки (одиночный выбор)" arrow>
                <RadioButtonCheckedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="none" aria-label="Без выделения">
              <Tooltip title="Без выделения" arrow>
                <BlockIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {showDensityButton && (
          <Tooltip
            title={`Плотность: ${density.label} → ${nextDensity.label}`}
            arrow
          >
            <IconButton
              size="small"
              aria-label="Переключить плотность"
              onClick={onDensityClick}
            >
              <density.Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {showThemeButton && (
          <Tooltip
            title={themeMode === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            arrow
          >
            <IconButton
              size="small"
              aria-label="Переключить тему"
              onClick={onThemeToggle}
            >
              {themeMode === 'light' ? (
                <Brightness4Icon fontSize="small" />
              ) : (
                <Brightness7Icon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}

        {showFullscreenButton && (
          <Tooltip
            title={
              isFullScreen
                ? 'Выйти из полноэкранного режима'
                : 'На весь экран'
            }
            arrow
          >
            <IconButton
              size="small"
              aria-label={
                isFullScreen
                  ? 'Выйти из полноэкранного режима'
                  : 'На весь экран'
              }
              onClick={() => table.setIsFullScreen(!isFullScreen)}
            >
              {isFullScreen ? (
                <FullscreenExitIcon fontSize="small" />
              ) : (
                <FullscreenIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </>
    );
  };

  return {
    // Дефолты фабрики
    enableTopToolbar: true,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableColumnVisibility: false,

    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableFilters: true,

    enablePagination: true,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
    initialPageSize: 10,

    positionGlobalFilter: 'none',
    positionToolbarAlertBanner: 'none',

    showSearchButton: true,
    initialShowSearch: false,

    // Переопределения из options
    ...overrides,

    // Флаги видимости возвращаем в результирующий объект
    showSelectionToggle,
    showFiltersButton,
    showSelectionCounter,
    showDensityButton,
    showThemeButton,
    showFullscreenButton,

    // Рендер: пользовательский (если был) побеждает стандартный
    renderToolbarInternalActions:
      overrides.renderToolbarInternalActions ?? defaultRender,
  };
}