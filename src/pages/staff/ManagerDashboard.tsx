import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { ManagerOverview } from './manager-tabs/ManagerOverview';
import { ManagerQueue } from './manager-tabs/ManagerQueue';
import { ManagerRevenue } from './manager-tabs/ManagerRevenue';
import { ManagerRbac } from './manager-tabs/ManagerRbac';
import { ManagerSettings } from './manager-tabs/ManagerSettings';
import { ManagerSchedule } from './manager-tabs/ManagerSchedule';
import { ManagerPatients } from './manager-tabs/ManagerPatients';
import { ManagerReviews } from './manager-tabs/ManagerReviews';
import { ManagerLogs } from './manager-tabs/ManagerLogs';
import { ProfileSettings } from '../shared/ProfileSettings';

export const ManagerDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  const renderTabContent = () => {
    switch (tab) {
      case 'queue':
        return <ManagerQueue />;
      case 'revenue':
        return <ManagerRevenue />;
      case 'schedule':
        return <ManagerSchedule />;
      case 'rbac':
        return <ManagerRbac />;
      case 'settings':
        return <ManagerSettings />;
      case 'patients':
        return <ManagerPatients />;
      case 'reviews':
        return <ManagerReviews />;
      case 'account':
      case 'aichat':
        return <ProfileSettings />;
      case 'logs':
        return <ManagerLogs />;
      default:
        return <ManagerOverview />;
    }
  };

  return (
    <div className="p-container-padding-desktop">
      {renderTabContent()}
    </div>
  );
};
