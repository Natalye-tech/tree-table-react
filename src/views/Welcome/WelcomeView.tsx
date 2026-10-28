import React, { useMemo, useState } from 'react';
import { Stack, Box, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ValueFormatterParams } from 'ag-grid-community';
import { TreeTable } from '../../components/TreeTable';
import { RowData, ColumnTreeData } from '../../components/TreeTable/types';
import MRTTree from '../../components/MRTTree/MRTTree';
import { UniversalGrid } from '../../components/UniversalGrid';
import type { MRT_ColumnDef } from 'material-react-table';
import type { MRT_RowSelectionState } from 'material-react-table'; // Правильный импорт


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



/// ***************************** MRTTree

type Person = {
  id: number;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  subRows?: Person[];
};

const initialData: Person[] = [
  {
    id: 1,
    firstName: 'Dylan',
    lastName: 'Murray',
    address: '261 Erdman Ford',
    city: 'East Daphne',
    state: 'Kentucky',
    subRows: [
      { 
        id: 2, 
        firstName: 'Ervin', 
        lastName: 'Reinger', 
        address: '566 Brakus Inlet', 
        city: 'South Linda', 
        state: 'West Virginia',
        subRows: [
          { 
            id: 4, 
            firstName: 'Brittanyqqq', 
            lastName: 'McCulloughqqq', 
            address: '722 Emie Streamqqq', 
            city: 'Lincoln', 
            state: 'Nebraskaqqq' },
          { 
            id: 5, 
            firstName: 'Brittanyqqqww', 
            lastName: 'McCulloughqqqww', 
            address: '722 Emie Streamqqqww', 
            city: 'Lincolnww', 
            state: 'Nebraskaqqqww' },
        ] 
      },
      { 
        id: 3, 
        firstName: 'Brittany', 
        lastName: 'McCullough', 
        address: '722 Emie Stream', 
        city: 'Lincoln', 
        state: 'Nebraska' },
    ],
  },
  { id: 4, firstName: 'Raquel', lastName: 'Kohler', address: '769 Dominic Grove', city: 'Columbus', state: 'Ohio' },
];

/// ***************************** ag-grid
// Пример данных
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

/// ***************************** MRTTree
  // Колонки
  const columns1 = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
      { accessorKey: 'address', header: 'Address' },
      { accessorKey: 'city', header: 'City' },
      { accessorKey: 'state', header: 'State' },
    ],
    [],
  );

  // Стейт родителя: хранит ID выбранных элементов
  const [selectedParentIds, setSelectedParentIds] = useState<number[]>([]);

  // Функция, которую передадим вниз. Она получит ID от ребенка
  const handleOnSelectIds = (ids: number[]) => {
    console.log('🎉 Родитель получил ID:', ids);
    setSelectedParentIds(ids);
    
    // Пример: тут можно сразу вызвать API
    // api.deleteItems(ids);
  };

  return (
    <Stack sx={{ m: 4 }} spacing={4}>

      <Typography variant="h6">
        Дерево-таблица tanstack table
      </Typography>
      <TreeTable data={fileTree} />


      <Typography variant="h6">
        Дерево-таблица material-react-table
      </Typography>
      <MRTTree
        data={initialData}
        columns={columns1}
        onSelectIds={handleOnSelectIds}
      />

      <Typography variant="h6">
        Дерево-таблица AG Grid
      </Typography>
      <UniversalGrid 
        data={serverData} 
        columns={serverColumns} 
        isTree={true} 
        // showCheckboxes={false}
      />
      <Typography variant="h6">
        Плоская таблица AG Grid
      </Typography>
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