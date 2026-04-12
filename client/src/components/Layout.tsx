import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Beef,
  Tag,
  Grass,
  Layers,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/animals', icon: Beef, label: 'Animais' },
  { path: '/tags', icon: Tag, label: 'Brincos' },
  { path: '/pastures', icon: Grass, label: 'Pastos' },
  { path: '/lots', icon: Layers, label: 'Lotes' },
  { path: '/contracts', icon: FileText, label: 'Contratos' },
  { path: '/finances', icon: DollarSign, label: 'Finanças' },
  { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  { path: '/settings', icon: Settings, label: 'Configurações' }
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, tenant } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="ml-3 font-semibold text-lg">{tenant?.name || 'FarollAgro'}</span>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xl font-bold text-green-600">🐂 FarollAgro</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut size={20} className="mr-3" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
