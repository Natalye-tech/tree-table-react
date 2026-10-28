import React, { useRef, useState } from 'react';
import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, ValueFormatterParams } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-theme-material.css';

interface TreeRowData {
  id: string;
  parentId: string | null;
  name: string;
  status: string;
  budget: number;
  manager: string;
  level: number;
}

const rowData: TreeRowData[] = [
  { id: "1", parentId: null, name: "Отдел продаж", status: "Активен", budget: 120000, manager: "Анна К.", level: 0 },
  { id: "2", parentId: "1", name: "Москва", status: "Активен", budget: 65000, manager: "Иван П.", level: 1 },
  { id: "3", parentId: "1", name: "Санкт-Петербург", status: "Активен", budget: 55000, manager: "Ольга М.", level: 1 },
  { id: "4", parentId: "2", name: "Розничные клиенты (Москва)", status: "Активен", budget: 30000, manager: "Сергей Т.", level: 2 },
  { id: "5", parentId: "2", name: "Корпоративные клиенты (Москва)", status: "Активен", budget: 35000, manager: "Елена В.", level: 2 },
  { id: "6", parentId: "3", name: "Розничные клиенты (СПб)", status: "Активен", budget: 25000, manager: "Дмитрий Р.", level: 2 },
  { id: "7", parentId: "3", name: "Корпоративные клиенты (СПб)", status: "Активен", budget: 30000, manager: "Наталья С.", level: 2 }
];

// Чистая рекурсивная функция
const getDescendants = (parentId: string): string[] => {
  const descendants: string[] = [];
  const findChildren = (currentParentId: string) => {
    const children = rowData.filter((row) => row.parentId === currentParentId);
    children.forEach((child) => {
      descendants.push(child.id);
      findChildren(child.id);
    });
  };
  findChildren(parentId);
  return descendants;
};

const TreeGrid = () => {
  const gridRef = useRef<AgGridReact<TreeRowData> | null>(null);
  
  const [expandedIds, setExpandedIds] = useState<string[]>(["1"]); 
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleCheckboxChange = (id: string, checked: boolean) => {
    console.log(`🔧 Клик по ID: ${id}`); // ЛОГ: смотри сюда в консоль браузера!
    
    const newSet = new Set(selectedIds);

    if (checked) {
      newSet.add(id);
      const descendants = getDescendants(id);
      console.log(`Добавляем потомков для ${id}:`, descendants);
      descendants.forEach((dId) => newSet.add(dId));
    } else {
      newSet.delete(id);
      const descendants = getDescendants(id);
      console.log(`даляем потомков для ${id}:`, descendants);
      descendants.forEach((dId) => newSet.delete(dId));
    }

    setSelectedIds(Array.from(newSet));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const getIndentPx = (level: number) => level * 30;

  const renderTreeCell = (params: any) => {
    const { data, value } = params;
    if (!data) return <span>{value}</span>;

    const indent = getIndentPx(data.level);
    const isExpanded = expandedIds.includes(data.id);
    const hasChildren = rowData.some((item) => item.parentId === data.id);

    return (
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              toggleExpand(data.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginRight: 8,
              transition: 'transform 0.2s'
            }}
          >
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </button>
        )}
        <span>{value}</span>
      </div>
    );
  };

  const buildTreeOrder = (parentId: string | null): TreeRowData[] => {
    const children = rowData
      .filter((row) => row.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

    let result: TreeRowData[] = [];
    children.forEach((child) => {
      result.push(child);
      if (expandedIds.includes(child.id)) {
        const grandChildren = buildTreeOrder(child.id);
        result = [...result, ...grandChildren];
      }
    });
    return result;
  };

  const visibleRowData = buildTreeOrder(null);

  const renderCheckboxCell = (params: any) => {
    const data = params.data; 
    const id = data?.id || params.node?.id;     
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

  const columnDefs: ColDef<TreeRowData>[] = [
    { 
      headerName: "Выбрать", 
      width: 60, 
      maxWidth: 60,
      sortable: false,
      resizable: false,
      cellRenderer: renderCheckboxCell 
    },
    {
      field: "name",
      headerName: "Наименование",
      flex: 2,
      cellRenderer: renderTreeCell,
      menuTabs: [],
      resizable: true,
      sortable: false 
    },
    { field: "status", headerName: "Статус", width: 120, sortable: false },
    { 
      field: "budget", 
      headerName: "Бюджет (₽)", 
      width: 140,
      sortable: false,
      valueFormatter: (params: ValueFormatterParams<TreeRowData>) => {
        return new Intl.NumberFormat('ru-RU').format(params.value as number);
      } 
    },
    { field: "manager", headerName: "Менеджер", flex: 1, sortable: false }
  ];

  const onGridReady = (params: { api: GridApi<TreeRowData> }) => {
    console.log("Сетка готова");
  };

  const handleGetSelected = () => {
    alert(`Выбрано элементов: ${selectedIds.length}\nID: ${selectedIds.join(', ')}`);
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        Дерево: Исправление ID
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={handleGetSelected}>
          Проверить выбор
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => setExpandedIds(rowData.map(r => r.id))}
        >
          Раскрыть всё
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => {
            setExpandedIds(["1"]);
            setSelectedIds([]); 
          }}
        >
          Свернуть всё (сброс)
        </Button>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Chip 
          label={`Выбрано элементов: ${selectedIds.length}`} 
          color="primary" 
          sx={{ fontWeight: 'bold' }} 
        />
      </Box>

      <div 
        style={{ height: 500, width: '100%', border: '1px solid #ccc', boxSizing: 'border-box' }}
      >
        <AgGridReact<TreeRowData>
          ref={gridRef}
          rowData={visibleRowData} 
          columnDefs={columnDefs}
          animateRows={true}
          onGridReady={onGridReady}
          defaultColDef={{ sortable: false }} 
        />
      </div>
      
    </Box>
  );
};

export default TreeGrid;
