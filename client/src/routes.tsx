
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { TaskCenterPage } from './pages/task-center-page';
import { TaskPage } from './pages/task-page';
import { FileVaultPage } from './pages/file-vault-page';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/task-center/task/:taskSlug" element={<TaskPage />} />
      <Route path="/task-center" element={<TaskCenterPage />} />
      <Route path="/file-vault" element={<FileVaultPage />} />
      <Route path="/" element={<TaskCenterPage />} />
    </Routes>
  );
};

export default AppRoutes;
