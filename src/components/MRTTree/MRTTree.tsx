import { useMemo, useEffect, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowData,
  type MRT_RowSelectionState,
} from 'material-react-table';

interface MRTTreeProps<T extends MRT_RowData> {
  data: T[];
  columns: MRT_ColumnDef<T>[];
  onSelectIds?: (ids: number[]) => void;
}

export const MRTTree = <T extends MRT_RowData & { id: number }>({
  data,
  columns,
  onSelectIds,
}: MRTTreeProps<T>) => {
  const tableColumns = useMemo(() => columns, [columns]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const table = useMaterialReactTable({
    columns: tableColumns,
    data,
    enableExpandAll: false,
    enableExpanding: true,
    enableRowSelection: true,
  });

  // Реагируем на изменение таблицы (клик по чекбоксу)
  useEffect(() => {
    const rowSelection = table.getState().rowSelection as MRT_RowSelectionState;
    
    const currentIds = data
      .filter((_, index) => rowSelection[index])
      .map(item => item.id);

    setSelectedIds(currentIds);
  }, [table, data]);

  const handleSelect = () => {
    if (!onSelectIds) return;
    if (selectedIds.length === 0) {
      alert('Сначала выберите строки!');
      return;
    }
    onSelectIds(selectedIds);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <MaterialReactTable table={table} />
    </div>
  );
};

export default MRTTree;
