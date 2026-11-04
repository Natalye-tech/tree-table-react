import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { TemplateTreeNode } from './TemplateTypes';

export type GetTestTableDataParams = {
  size: number;
  offset: number;
  sortDirection: 'ASC' | 'DESC';
  sortField: string;
  searchTerm: string;
};

export type GetTestTableDataResponse = {
  rows: TemplateTreeNode[];
  total: number;
};

export const testTableApi = createApi({
  reducerPath: 'testTableApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getTestTableData: builder.query<
      GetTestTableDataResponse,
      GetTestTableDataParams
    >({
      query: (params) => ({
        url: '/templates/roots',
        params,
      }),
    }),
  }),
});

export const { useGetTestTableDataQuery } = testTableApi;