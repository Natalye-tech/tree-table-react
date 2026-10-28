import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  Box, Typography, Button, Stack, Chip, Paper, 
  MenuItem, MenuList, Popover 
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Checkbox from '@mui/material/Checkbox';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, ICellRendererParams, CellContextMenuEvent } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-theme-material.css';

// --- ТИПЫ ---

export interface GridRowData {
  id: string;
  parentId?: string | null;
  [key: string]: any;
}

export type GridColumnDef = ColDef<GridRowData>;

interface ContextMenuItem {
  label: string;
  action: string;
  icon?: React.ReactNode;
  color?: string;
}

interface TreeGridProps {
  data: GridRowData[];
  columns: GridColumnDef[];
  isTree: boolean;
  showCheckboxes?: boolean;
  contextMenuItems?: ContextMenuItem[];
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

const getDescendants = (parentId: string, data: GridRowData[]): string[] => {
  const descendants: string[] = [];
  const findChildren = (currentParentId: string) => {
    const children = data.filter((row) => row.parentId === currentParentId);
    children.forEach((child) => {
      descendants.push(child.id);
      findChildren(child.id);
    });
  };
  findChildren(parentId);
  return descendants;
};

const buildTreeOrder = (
  parentId: string | null, 
  data: GridRowData[], 
  expandedIds: string[]
): GridRowData[] => {
  const children = data
    .filter((row) => row.parentId === parentId)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  let result: GridRowData[] = [];
  children.forEach((child) => {
    result.push(child);
    if (expandedIds.includes(child.id)) {
      const grandChildren = buildTreeOrder(child.id, data, expandedIds);
      result = [...result, ...grandChildren];
    }
  });
  return result;
};

// ==========================================
// КОМПОНЕНТ: ЧЕКБОКС В ЗАГОЛОВКЕ
// ==========================================

interface SelectAllHeaderProps {
  onToggleAll: (checked: boolean) => void;
  totalRows: number;
  selectedCount: number;
}

const SelectAllHeader: React.FC<SelectAllHeaderProps> = ({ 
  onToggleAll, 
  totalRows, 
  selectedCount 
}) => {
  const isChecked = selectedCount === totalRows && totalRows > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalRows;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggleAll(e.target.checked);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Checkbox 
        checked={isChecked}
        indeterminate={isIndeterminate}
        onChange={handleChange}
        color="primary"
        size="small"
      />
    </div>
  );
};

const UniversalGrid = ({ 
  data, 
  columns, 
  isTree, 
  showCheckboxes = true,
  contextMenuItems = []
}: TreeGridProps) => {
  const gridRef = useRef<AgGridReact<GridRowData> | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]); 
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [contextMenu, setContextMenu] = useState<{
    cell: CellContextMenuEvent<GridRowData> | null;
    anchorEl: HTMLElement | null;
  }>({ cell: null, anchorEl: null }); 

  const openContextMenu = useCallback(
    (params: CellContextMenuEvent<GridRowData>) => {
      const event = params.event;
      if (!event) return;

      const mouseEvent = event as MouseEvent;
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();

      // ОТКРЫВАЕМ МЕНЮ ТОЛЬКО ЕСЛИ ЕСТЬ ПУНКТЫ
      if (contextMenuItems.length === 0) {
        return; // Просто блокируем браузерное меню и выходим
      }

      setContextMenu({
        cell: params,
        anchorEl: mouseEvent.target as HTMLElement,
      });
    },
    [contextMenuItems] // Важно: добавляем в зависимости, чтобы функция видела актуальный массив
  );

  const closeContextMenu = () => {
    setContextMenu({ cell: null, anchorEl: null });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.anchorEl && !contextMenu.anchorEl.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handleToggleAll = useCallback((checked: boolean) => {
    if (!showCheckboxes) return;
    
    if (checked) {
      setSelectedIds(data.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  }, [data, showCheckboxes]);

  if (data.length === 0) {
    return (
      <Box sx={{ padding: 3, maxWidth: 1200, margin: '0 auto' }}>
        <Typography variant="body1" color="text.secondary">
          Нет данных для отображения
        </Typography>
      </Box>
    );
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (!showCheckboxes) return;

    const newSet = new Set(selectedIds);

    if (checked) {
      newSet.add(id);
      if (isTree) {
        const descendants = getDescendants(id, data);
        descendants.forEach((dId) => newSet.add(dId));
      }
    } else {
      newSet.delete(id);
      if (isTree) {
        const descendants = getDescendants(id, data);
        descendants.forEach((dId) => newSet.delete(dId));
      }
    }

    setSelectedIds(Array.from(newSet));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const renderTreeCell = (params: ICellRendererParams<GridRowData>) => {
    const { data: rowData, value } = params;
    if (!rowData) return <span>{value}</span>;

    const calculateLevel = (row: GridRowData): number => {
      if (!row.parentId) return 0;
      let level = 1;
      let currentParentId: string | null | undefined = row.parentId;
      while (currentParentId) {
        const parent = data.find((r: GridRowData) => r.id === currentParentId);
        if (!parent) break;
        level++;
        currentParentId = parent.parentId; 
      }
      return level;
    };

    const level = calculateLevel(rowData);
    const indent = level * 30;
    const hasChildren = data.some((item: GridRowData) => item.parentId === rowData.id);
    const isExpanded = expandedIds.includes(rowData.id);

    return (
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(rowData.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 8 }}
          >
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </button>
        )}
        <span>{value}</span>
      </div>
    );
  };

  const renderCheckboxCell = (params: ICellRendererParams<GridRowData>) => {
    const rowData = params.data; 
    const id = rowData?.id;
    
    if (!id) return <span></span>;
    const isChecked = selectedIds.includes(id);

    return (
      <input 
        type="checkbox" 
        checked={isChecked}
        onChange={(e) => handleCheckboxChange(id, e.target.checked)}
        style={{ width: 16, height: 16 }}
      />
    );
  };

  // ==========================================
  // КОНФИГУРАЦИЯ КОЛОНОК
  // ==========================================

  let finalColumns: GridColumnDef[] = [];
  let visibleRowData: GridRowData[] = data;

  if (showCheckboxes) {
    finalColumns.push({ 
      headerName: "", 
      width: 60, 
      maxWidth: 60,
      sortable: false,
      resizable: false,
      cellRenderer: renderCheckboxCell,
      headerComponent: () => (
        <SelectAllHeader 
          onToggleAll={handleToggleAll} 
          totalRows={data.length} 
          selectedCount={selectedIds.length} 
        />
      ),
      menuTabs: [] 
    });

    if (isTree && columns.length > 0) {
      const firstCol = { ...columns[0] };
      firstCol.cellRenderer = renderTreeCell;
      firstCol.flex = 2;
      firstCol.sortable = false;
      firstCol.resizable = true;
      firstCol.menuTabs = [];
      finalColumns.push(firstCol);
      
      if (columns.length > 1) {
        finalColumns = [...finalColumns, ...columns.slice(1)];
      }
      visibleRowData = buildTreeOrder(null, data, expandedIds);
    } else if (columns.length > 0) {
      finalColumns = [...finalColumns, ...columns];
      finalColumns = finalColumns.map((col, index) => {
        if (index === 0) return col;
        return {
          ...col,
          sortable: true,
          resizable: true,
          menuTabs: ['filterMenuTab', 'generalMenuTab']
        };
      });
    }
  } else {
    if (isTree && columns.length > 0) {
      const firstCol = { ...columns[0] };
      firstCol.cellRenderer = renderTreeCell;
      firstCol.sortable = false;
      firstCol.resizable = true;
      firstCol.menuTabs = [];
      finalColumns.push(firstCol);
      
      if (columns.length > 1) {
        finalColumns = [...finalColumns, ...columns.slice(1)];
      }
      visibleRowData = buildTreeOrder(null, data, expandedIds);
    } else {
      finalColumns = [...columns];
      finalColumns = finalColumns.map(col => ({
        ...col,
        sortable: true,
        resizable: true,
        menuTabs: ['filterMenuTab', 'generalMenuTab']
      }));
    }
  }

  const onGridReady = (params: { api: GridApi<GridRowData> }) => {
    console.log("Сетка готова");
  };

  const handleGetSelected = () => {
    alert(`Выбрано элементов: ${selectedIds.length}\nID: ${selectedIds.join(', ')}`);
  };

  const handleMenuAction = (action: string) => {
    const row = contextMenu.cell?.node.data;
    
    console.log(`Действие "${action}" для строки ID: ${row?.id}, Name: ${row?.name}`);
    
    // Тут можно добавить свою логику под конкретные экшены
    if (action === 'delete') {
      setSelectedIds(prev => prev.filter(id => id !== row?.id));
      alert(`Строка "${row?.name}" помечена как удалённая`);
      closeContextMenu();
    } else if (action === 'edit') {
      alert(`Редактирование строки: "${row?.name}"`);
      closeContextMenu();
    } else {
      console.log('Кастомное действие:', action);
      closeContextMenu();
      // чтобы родительский компонент реагировал, можно добавить проп onMenuAction
    }
  };

  return (
    <Box sx={{ padding: 0, maxWidth: 1200, margin: 0 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {isTree && showCheckboxes && (
          <>
            <Button variant="contained" onClick={handleGetSelected}>
              Проверить выбор
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setExpandedIds(data.map(r => r.id))}
            >
              Раскрыть всё
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => { setExpandedIds([]); setSelectedIds([]); }}
            >
              Свернуть всё и сбросить выбор
            </Button>
          </>
        )}
        
        {!showCheckboxes && !isTree && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Режим плоской таблицы: чекбоксы отключены.
          </Typography>
        )}
      </Stack>

      {isTree && showCheckboxes && (
        <Box sx={{ mb: 1 }}>
          <Chip 
            label={`Выбрано элементов: ${selectedIds.length}`} 
            color="primary" 
            sx={{ fontWeight: 'bold' }} 
          />
        </Box>
      )}

      <Paper sx={{ 
        width: '100%', 
        overflowX: 'auto', 
        mb: 2, 
        borderRadius: 2, 
        border: '1px solid', 
        borderColor: 'grey.300' 
      }}>
        <div 
          style={{ height: 500, width: '100%', boxSizing: 'border-box' }}
          onContextMenu={(e) => e.preventDefault()}>
          <AgGridReact<GridRowData>
            ref={gridRef}
            rowData={visibleRowData} 
            columnDefs={finalColumns}
            animateRows={true}
            onGridReady={onGridReady}
            defaultColDef={{ 
              resizable: isTree ? false : true, 
              sortable: isTree ? false : true,
              menuTabs: isTree ? [] : ['filterMenuTab', 'generalMenuTab'],
            }}
            suppressRowClickSelection={true}
            suppressContextMenu={true} 
            onCellContextMenu={openContextMenu} // Твой кастомный Popover
          />
        </div>
      </Paper>  

      {/* --- КАСТОМНОЕ КОНТЕКСТНОЕ МЕНЮ (ТОЛЬКО ЕСЛИ ЕСТЬ ПУНКТЫ) --- */}
      {contextMenuItems.length > 0 && contextMenu.cell && contextMenu.anchorEl && (
        <Popover
          open={true} // Открыт, если есть пункты и событие
          anchorEl={contextMenu.anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          onClose={closeContextMenu}
          PaperProps={{ sx: { minWidth: 200, boxShadow: 3 } }}
          sx={{
            '& .MuiPaper-root': {
              padding: 0,
              borderRadius: '8px'
            }
          }}
        >
          <MenuList>
            {contextMenuItems.map((item, idx) => (
              <MenuItem
                key={idx}
                onClick={() => handleMenuAction(item.action)}
                sx={{ 
                  gap: 1, 
                  color: item.color || 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                {item.icon}
                <Typography variant="body2">{item.label}</Typography>
              </MenuItem>
            ))}
          </MenuList>
        </Popover>
      )}
    </Box>
  );
};

export default UniversalGrid;