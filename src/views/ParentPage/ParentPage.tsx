import { useMemo, useState } from 'react';
import {
  createTheme,
  CssBaseline,
  Stack,
  ThemeProvider,
} from '@mui/material';
import type { MRT_ColumnDef } from 'material-react-table';

import { MRTTree } from '../../components/MRTTree/Tree';
import {
  createToolbarConfig,
  DENSITIES,
  type ThemeMode,
} from '../../components/MRTTree/components/ToolbarConfig';
import type { Template } from './TemplateTypes';
import type { SelectionMode } from '../../components/MRTTree/components/Types';

// ────────────────────────────────────────────────────────────────────────────
// Моковые данные
// ────────────────────────────────────────────────────────────────────────────

const columns: MRT_ColumnDef<Template>[] = [
  { accessorKey: 'name', header: 'Name' },
];

/** Корневые строки */
const initialData: Template[] = [
  { id: 1, name: 'CEO111', managerId: null },
  { id: 2, name: 'CTO111', managerId: 1 },
];

/** Дети по id родителя (имитация API) */
const mockApiData: Record<number, Template[]> = {
  1: [
    { id: 3, name: 'CTO22', managerId: 1 },
    { id: 4, name: 'CFO22', managerId: 1 },
  ],
  2: [
    { id: 5, name: 'Team Lead', managerId: 2 },
    { id: 6, name: 'Senior Dev', managerId: 2 },
  ],
};

/** Имитация асинхронного запроса с задержкой */
const loadChildren = async (row: Template): Promise<Template[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockApiData[row.id] ?? [];
};

/** У строки есть дети, если для её id есть запись в mockApiData */
const canExpand = (row: Template): boolean =>
  !!mockApiData[row.id]?.length;

// ────────────────────────────────────────────────────────────────────────────
// Кастомный фон строк (пример)
// ────────────────────────────────────────────────────────────────────────────

const getRowBackgroundColor = (row: Template): string | undefined => {
  if (row.managerId === null) return 'rgba(25, 118, 210, 0.08)'; // корень — синий
  if (row.id % 2 === 0) return 'rgba(76, 175, 80, 0.06)';        // чётные — зелёный
  return undefined;
};

// ────────────────────────────────────────────────────────────────────────────
// Компонент
// ────────────────────────────────────────────────────────────────────────────

export const ParentPage = () => {
  const [densityIndex, setDensityIndex] = useState(1);
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>('checkbox');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const density = DENSITIES[densityIndex];
  const nextDensity = DENSITIES[(densityIndex + 1) % DENSITIES.length];

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: themeMode },
      }),
    [themeMode],
  );

  const toolbar = createToolbarConfig<Template>({
      // ─── Обязательные спец-поля ───────────────────────────────────────
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

      // ─── Видимость отдельных элементов правой панели ──────────────────
      showFiltersButton: true,
      showSelectionCounter: true,
      showDensityButton: true,
      showThemeButton: true,
      showFullscreenButton: true,

      // ─── ПАГИНАЦИЯ ────────────────────────────────────────────────────
      enableBottomToolbar: true,        // показать нижнюю панель
      enablePagination: true,           // включить пагинацию
      rowsPerPageOptions: [5, 10, 25, 50], // список в «Rows per page»
      initialPageSize: 10,              // значение по умолчанию

      // ─── Общие настройки тулбара ──────────────────────────────────────
      enableTopToolbar: true,
      enableGlobalFilter: true,
      enableColumnFilters: true,
      enableFilters: true,
      positionGlobalFilter: 'none',
      positionToolbarAlertBanner: 'none',
      showSearchButton: true,
      initialShowSearch: false,
    });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Stack sx={{ p: 2 }} spacing={2}>
        <MRTTree<Template>
          initialData={initialData}
          columns={columns}
          getRowId={(row: Template) => String(row.id)}
          getSubRows={(row: Template) => row.subRows}
          withSubRows={(row: Template, subRows: Template[]) => ({
            ...row,
            subRows,
          })}
          loadChildren={loadChildren}
          canExpand={canExpand}
          toolbar={toolbar}
          rowHeight={density.rowHeight}
          headerHeight={density.headerHeight}
          checkboxSize={density.checkboxSize}
          indentPx={35}
          selectionMode={selectionMode}
          getRowBackgroundColor={getRowBackgroundColor}
        />
      </Stack>
    </ThemeProvider>
  );
};

export default ParentPage;