import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Beef, Tag, Sprout, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { tenant } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    api.get('/reports/dashboard')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  });

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-lg"></div></div>;
  }

  const cards = [
    { label: 'Total Animais', value: stats?.animals?.total || 0, icon: Beef, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Animais Ativos', value: stats?.animals?.active || 0, icon: Beef, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pastos', value: stats?.pastures?.total || 0, icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Brincos Disponíveis', value: stats?.tags?.available || 0, icon: Tag, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Receita Mensal', value: `R$ ${(stats?.finances?.monthlyRevenue || 0).toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Despesa Mensal', value: `R$ ${(stats?.finances?.monthlyExpense || 0).toLocaleString('pt-BR')}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Dashboard de Gestão Pecuária</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md-grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bg}`}>
                <card.icon size={24} className={card.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            {stats?.recentEvents?.length > 0 ? stats.recentEvents.map((event: any) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${event.type === 'BIRTH' ? 'bg-green-100' : event.type === 'DEATH' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <Beef size={16} className={event.type === 'BIRTH' ? 'text-green-600' : event.type === 'DEATH' ? 'text-red-600' : 'text-blue-600'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{event.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(event.occurredAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma atividade recente</p>}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Financeiro</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Receita Mensal</span>
              <span className="text-green-600 font-semibold">R$ {(stats?.finances?.monthlyRevenue || 0).toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Despesa Mensal</span>
              <span className="text-red-600 font-semibold">R$ {(stats?.finances?.monthlyExpense || 0).toLocaleString('pt-BR')}</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-between items-center">
              <span className="text-gray-900 dark:text-white font-semibold">Lucro Mensal</span>
              <span className={`font-bold ${(stats?.finances?.monthlyProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(stats?.finances?.monthlyProfit || 0).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
