import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { testTableApi } from '../views/ParentPage/api';

export const store = configureStore({
  reducer: {
    // RTK Query сам добавит свой reducer под ключом reducerPath ('testTableApi')
    [testTableApi.reducerPath]: testTableApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(testTableApi.middleware),
});

// Включает refetchOnFocus / refetchOnReconnect, если будете использовать
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;