
import React from 'react';
import { Route, Switch } from 'wouter';
import { TaskPage } from './pages/task-page';
import FileVaultPage from './pages/file-vault-page';
import TaskCenterPage from './pages/task-center-page';
import CardTaskPage from './pages/card-task-page';
import NotFoundPage from './pages/not-found-page';

const AppRoutes = () => {
  return (
    <Switch>
      <Route path="/task-center" component={TaskCenterPage} />
      <Route path="/task-center/task/card-:slug" component={CardTaskPage} />
      <Route path="/task-center/task/card-:slug/questionnaire" component={CardTaskPage} />
      <Route path="/task-center/task/:taskSlug" component={TaskPage} />
      <Route path="/file-vault" component={FileVaultPage} />
      <Route path="/" component={TaskCenterPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
};

export default AppRoutes;
