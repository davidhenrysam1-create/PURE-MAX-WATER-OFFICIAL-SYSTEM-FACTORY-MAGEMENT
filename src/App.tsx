/**
 * Pure Max - Purified Mineral Water Factory Management System
 * Main Application Component
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { LoginModal } from './components/auth/LoginModal';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { SalesModule } from './components/sales/SalesModule';
import { ProductionModule } from './components/production/ProductionModule';
import { SalesDailyRecordsModule } from './components/sales/SalesDailyRecordsModule';
import { AttendanceModule } from './components/attendance/AttendanceModule';
import { ExpensesModule } from './components/expenses/ExpensesModule';
import { RepairsModule } from './components/repairs/RepairsModule';
import { EquipmentLogsModule } from './components/equipment/EquipmentLogsModule';
import { ChatModule } from './components/chat/ChatModule';
import { UserManagementModule } from './components/users/UserManagementModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { SystemHealthModule } from './components/system/SystemHealthModule';
import { PgAdminQueriesModule } from './components/system/PgAdminQueriesModule';
import { ProfileModal } from './components/profile/ProfileModal';
import { FleetMapModule } from './components/fleet/FleetMapModule';
import { GlobalToast } from './components/common/GlobalToast';
import { WebRTCCallModal } from './components/call/WebRTCCallModal';
import { InspectionBanner } from './components/common/InspectionBanner';
import { socketService } from './services/socketService';
import { canViewGpsMap } from './utils/roleAccess';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pure Max App Error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('puremax_current_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold">Pure Max Factory OS Recovery</h1>
            <p className="text-xs text-slate-400">
              The application encountered a transient state error. Click below to restore full factory session.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Pure Max System</span>
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentUser, activeTab, theme, isFirstLoginPending, activeRole, localGlassTheme } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (currentUser) {
      socketService.init({
        id: currentUser.id,
        employeeId: currentUser.employeeId,
        role: currentUser.role,
        name: currentUser.name,
      });
    }
  }, [currentUser]);

  if (!currentUser || isFirstLoginPending) {
    return <LoginModal />;
  }

  const themeAtmosphere: Record<string, { darkBg: string; lightBg: string }> = {
    indigo: { darkBg: 'bg-[#020617]', lightBg: 'bg-slate-50' },
    emerald: { darkBg: 'bg-[#02130e]', lightBg: 'bg-[#f0fdf4]' },
    blue: { darkBg: 'bg-[#020b18]', lightBg: 'bg-[#eff6ff]' },
    gold: { darkBg: 'bg-[#150f02]', lightBg: 'bg-[#fffbeb]' },
    purple: { darkBg: 'bg-[#0e0318]', lightBg: 'bg-[#faf5ff]' },
    cyan: { darkBg: 'bg-[#01141a]', lightBg: 'bg-[#ecfeff]' },
    rose: { darkBg: 'bg-[#180309]', lightBg: 'bg-[#fff1f2]' },
    slate: { darkBg: 'bg-[#0b0f17]', lightBg: 'bg-[#f8fafc]' },
  };

  const activeColor = theme?.primaryColor || 'indigo';
  const isDark = theme?.darkMode ?? true;
  const currentTheme = themeAtmosphere[activeColor] || themeAtmosphere.indigo;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardModule />;
      case 'map':
      case 'fleet_map':
        // Issue #7: single source of truth for the GPS map allow-list.
        if (!canViewGpsMap(activeRole)) {
          return <DashboardModule />;
        }
        return <FleetMapModule />;
      case 'sales':
        if (['staff', 'operator', 'tricycle_staff', 'van_staff'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <SalesModule />;
      case 'production':
        // Sales Production Officer: Strictly see dedicated Sales Daily Records (NOT Engineer production/raw material records)
        if (activeRole === 'sales_manager') {
          return <SalesDailyRecordsModule />;
        }
        // Production: Restrict visibility so ONLY Manager, Production Engineer, and Developer can view (Staff & Operator strictly excluded)
        if (!['developer', 'ceo', 'manager', 'second_manager', 'engineer'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <ProductionModule />;
      case 'attendance':
        return <AttendanceModule />;
      case 'expenses':
        if (!['developer', 'ceo', 'manager', 'second_manager'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <ExpensesModule />;
      case 'repairs':
        if (!['developer', 'ceo', 'manager', 'second_manager'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <RepairsModule />;
      case 'equipment':
        // Equipment & Water Logs: Visible ONLY to Production Engineer, Manager, and Developer (Hidden from Staff & Sales Officers)
        if (!['developer', 'ceo', 'manager', 'second_manager', 'engineer'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <EquipmentLogsModule />;
      case 'chat':
        return <ChatModule />;
      case 'users':
        if (!['developer', 'manager', 'second_manager'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <UserManagementModule />;
      case 'reports':
        if (!['developer', 'ceo', 'manager', 'second_manager', 'sales_manager'].includes(activeRole)) {
          return <DashboardModule />;
        }
        return <ReportsModule />;
      case 'system':
        if (activeRole !== 'developer') {
          return <DashboardModule />;
        }
        return <SystemHealthModule />;
      case 'pgadmin':
        if (activeRole !== 'developer') {
          return <DashboardModule />;
        }
        return <PgAdminQueriesModule />;
      case 'profile':
        return <ProfileModal />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div
      id="app-main-layout"
      data-glass-theme={localGlassTheme}
      className={`min-h-screen min-h-[100dvh] ${
        isDark ? `dark ${currentTheme.darkBg} text-slate-100` : `${currentTheme.lightBg} text-slate-900`
      } font-sans antialiased transition-colors duration-300 flex flex-col w-full max-w-full overflow-x-hidden`}
    >
      <GlobalToast />
      <WebRTCCallModal />
      <InspectionBanner />
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex flex-1 max-w-7xl w-full max-w-full mx-auto min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] overflow-x-hidden min-w-0">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-2 sm:p-4 lg:p-6 pb-24 md:pb-8 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
