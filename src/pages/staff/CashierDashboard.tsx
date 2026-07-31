import React from 'react';
import { useSearchParams } from 'react-router-dom';

// Tab Components
import { CashierBilling } from './cashier-tabs/CashierBilling';
import { CashierReport } from './cashier-tabs/CashierReport';
import { CashierHistory } from './cashier-tabs/CashierHistory';
import { ProfileSettings } from '../shared/ProfileSettings';

export const CashierDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  const renderTabContent = () => {
    switch (tab) {
      case 'report':
        return <CashierReport />;
      case 'history':
        return <CashierHistory />;
      case 'settings':
        return <ProfileSettings />;
      default:
        return <CashierBilling />;
    }
  };

  return (
    <div className="p-container-padding-desktop">
      {renderTabContent()}
    </div>
  );
};
