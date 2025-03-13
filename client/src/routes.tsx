
import React from 'react';
import { Route, Switch } from 'wouter';
import { TaskPage } from './pages/task-page';
import FileVaultPage from './pages/file-vault-page';
import TaskCenterPage from './pages/task-center-page';

const AppRoutes = () => {
  return (
    <Switch>
      <Route path="/task-center/task/:taskSlug" component={TaskPage} />
      <Route path="/task-center" component={TaskCenterPage} />
      <Route path="/file-vault" component={FileVaultPage} />
      <Route path="/" component={TaskCenterPage} />
    </Switch>
  );
};

export default AppRoutes;
