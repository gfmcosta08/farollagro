import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import api from '../services/api';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [mortality, setMortality] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, occupancyRes, mortalityRes] = await Promise.all([
        api.get('/reports/finances/summary'),
        api.get('/reports/pastures/occupancy'),
        api.get('/reports/animals/mortality')
      ]);
      setSummary(summaryRes.data);
      setOccupancy(occupancyRes.data);
      setMortality(mortalityRes.data);
    } catch { toast.error('Erro ao carregar relatórios'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-gray-200 rounded-lg"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Relatórios e Análises</h1><p className="text-gray-500">Visão geral do negócio</p></div>

      {/* Financial Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Resumo Financeiro {summary?.year}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {(summary?.totalRevenue || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Despesa Total</p>
            <p className="text-2xl font-bold text-red-600">R$ {(summary?.totalExpense || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Lucro</p>
            <p className="text-2xl font-bold text-blue-600">R$ {(summary?.profit || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Margem</p>
            <p className="text-2xl font-bold text-purple-600">{summary?.margin || 0}%</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(v) => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][v-1]} />
              <YAxis />
              <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
              <Bar dataKey="revenue" name="Receita" fill="#22c55e" />
              <Bar dataKey="expense" name="Despesa" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pasture Occupancy */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Ocupação de Pastos</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="animalCount" name="Animais" fill="#3b82f6" />
              <Bar dataKey="occupancyRate" name="Ocupação %" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mortality */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Mortalidade</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500">Total de Animais</p>
            <p className="text-2xl font-bold">{mortality?.totalAnimals || 0}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Óbitos</p>
            <p className="text-2xl font-bold text-red-600">{mortality?.deadAnimals || 0}</p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Taxa de Mortalidade</p>
            <p className="text-2xl font-bold text-orange-600">{mortality?.mortalityRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
