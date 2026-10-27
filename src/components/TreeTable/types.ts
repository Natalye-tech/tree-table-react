export interface RowData {
  id: string;
  name: string;
  size: string;
  subRows?: RowData[];
}

export interface ColumnTreeData {
    field: string,
    headerName: string,
    type?: string,
    width?: string | number,
    sx?: any,
    render?: any,
    isExpanded?: any,
}