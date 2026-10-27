import React, { useState } from 'react';
import { Stack, Box } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ValueFormatterParams } from 'ag-grid-community'; // <-- добавь этот импорт сверху
import { TreeTable } from '../../components/TreeTable/TreeTable';
import { RowData, ColumnTreeData } from '../../components/TreeTable/types';
import MRTTree from '../../components/MRTTree/MRTTree';
import { UniversalGrid } from '../../components/UniversalGrid/UniversalGrid'; 


/// ***************************** TreeTable
const columns: ColumnTreeData[] = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'firstName', headerName: 'First name', width: 130 },
  { field: 'lastName', headerName: 'Last name', width: 130 },
  { field: 'age', headerName: 'Age', type: 'number', width: 90 },
];

const fileTree: RowData[] = [
  {
    id: 'root',
    name: 'Проект',
    size: '-',
    subRows: [
      {
        id: 'src',
        name: 'src',
        size: '-',
        subRows: [
          { id: 'btn', name: 'Button.tsx', size: '2 KB' },
          { id: 'input', name: 'Input.tsx', size: '3 KB' },
        ],
      },
      { id: 'readme', name: 'README.md', size: '1 KB' },
    ],
  },
];

/// ***************************** ag-grid

// Пример данных (как будто с сервера)
const serverData = [
  { id: "1", parentId: null, name: "Отдел продаж", status: "Активен", budget: 120000, manager: "Анна К." },
  { id: "2", parentId: "1", name: "Москва", status: "Активен", budget: 65000, manager: "Иван П." },
  { id: "3", parentId: "1", name: "Санкт-Петербург", status: "Активен", budget: 55000, manager: "Ольга М." },
  { id: "4", parentId: "2", name: "Розничные клиенты (Москва)", status: "Активен", budget: 30000, manager: "Сергей Т." },
  { id: "5", parentId: "2", name: "Корпоративные клиенты (Москва)", status: "Активен", budget: 35000, manager: "Елена В." },
  { id: "6", parentId: "3", name: "Розничные клиенты (СПб)", status: "Активен", budget: 25000, manager: "Дмитрий Р." },
  { id: "7", parentId: "3", name: "Корпоративные клиенты (СПб)", status: "Активен", budget: 30000, manager: "Наталья С." }
];

// Колонки
const serverColumns = [
  { field: "name", headerName: "Наименование" },
  { field: "status", headerName: "Статус", width: 120 },
  { 
    field: "budget", 
    headerName: "Бюджет (₽)", 
    width: 140,
    valueFormatter: (params: ValueFormatterParams<any>) => new Intl.NumberFormat('ru-RU').format(params.value) 
  },
  { field: "manager", headerName: "Менеджер", flex: 1 }
];



export const WelcomeView: React.FC = () => {

  return (
    <Stack sx={{ m: 4 }} spacing={4}>
      <TreeTable data={fileTree} />
      <MRTTree />
      <UniversalGrid 
        data={serverData} 
        columns={serverColumns} 
        isTree={true} 
        // showCheckboxes={false}
      />
      <h2>Режим 2: Плоская таблица (с сортировкой)</h2>
      <UniversalGrid 
        data={serverData} 
        columns={serverColumns} 
        isTree={false} 
        contextMenuItems={[
          { label: 'Экспорт в PDF', action: 'export-pdf', icon: <FileDownloadIcon /> },
          { label: 'Назначить ответственного', action: 'assign-owner', color: 'warning.main' }
        ]}
      />
    </Stack>
  );
};

export default WelcomeView;