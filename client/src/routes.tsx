
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { TaskCenterPage } from './pages/task-center-page';
import { TaskPage } from './pages/task-page';
import { FileVaultPage } from './pages/file-vault-page';

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
