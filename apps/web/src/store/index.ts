import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    // Slices added as features are built
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
