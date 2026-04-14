import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function Reports() {
  const { tenant } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [mortality, setMortality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchData();
  }, [tenant?.id]);

  const fetchData = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01T00:00:00.000Z`;
      const yearEnd = `${year}-12-31T23:59:59.999Z`;

      const [financesRes, pasturesRes, lotsRes, animalLotsRes, animalsRes] = await Promise.all([
        supabase
          .from('Finance')
          .select('type,amount,date,status')
          .eq('tenantId', tenant.id)
          .gte('date', yearStart)
          .lte('date', yearEnd),
        supabase
          .from('Pasture')
          .select('id,name,capacityUA')
          .eq('tenantId', tenant.id)
          .is('deletedAt', null),
        supabase
          .from('Lot')
          .select('id,pastureId')
          .eq('tenantId', tenant.id)
          .is('deletedAt', null),
        supabase
          .from('AnimalLot')
          .select('lotId,removedAt')
          .is('removedAt', null),
        supabase
          .from('Animal')
          .select('id,status')
          .eq('tenantId', tenant.id)
          .is('deletedAt', null)
      ]);

      if (financesRes.error) throw financesRes.error;
      if (pasturesRes.error) throw pasturesRes.error;
      if (lotsRes.error) throw lotsRes.error;
      if (animalLotsRes.error) throw animalLotsRes.error;
      if (animalsRes.error) throw animalsRes.error;

      const finances = Array.isArray(financesRes.data) ? financesRes.data : [];
      const pastures = Array.isArray(pasturesRes.data) ? pasturesRes.data : [];
      const lots = Array.isArray(lotsRes.data) ? lotsRes.data : [];
      const animalLots = Array.isArray(animalLotsRes.data) ? animalLotsRes.data : [];
      const animals = Array.isArray(animalsRes.data) ? animalsRes.data : [];

      const monthly = MONTH_LABELS.map((_, index) => ({
        month: index + 1,
        revenue: 0,
        expense: 0
      }));

      let totalRevenue = 0;
      let totalExpense = 0;
      finances.forEach((item) => {
        if (item.status === 'CANCELLED') return;
        if (!item.date) return;

        const month = new Date(item.date).getMonth();
        const amount = Number(item.amount || 0);

        if (item.type === 'REVENUE') {
          monthly[month].revenue += amount;
          totalRevenue += amount;
        } else {
          monthly[month].expense += amount;
          totalExpense += amount;
        }
      });

      const profit = totalRevenue - totalExpense;
      const margin = totalRevenue > 0 ? Number(((profit / totalRevenue) * 100).toFixed(2)) : 0;

      const lotPasture: Record<string, string> = {};
      lots.forEach((lot) => {
        if (lot.pastureId) {
          lotPasture[lot.id] = lot.pastureId;
        }
      });

      const animalsPerPasture: Record<string, number> = {};
      animalLots.forEach((animalLot) => {
        const pastureId = lotPasture[animalLot.lotId];
        if (!pastureId) return;
        animalsPerPasture[pastureId] = (animalsPerPasture[pastureId] || 0) + 1;
      });

      const occupancyData = pastures.map((pasture) => {
        const animalCount = animalsPerPasture[pasture.id] || 0;
        const capacity = Number(pasture.capacityUA || 0);
        return {
          id: pasture.id,
          name: pasture.name,
          animalCount,
          occupancyRate: capacity > 0 ? Number(((animalCount / capacity) * 100).toFixed(2)) : 0
        };
      });

      const totalAnimals = animals.length;
      const deadAnimals = animals.filter((animal) => animal.status === 'DEAD').length;
      const mortalityRate = totalAnimals > 0 ? Number(((deadAnimals / totalAnimals) * 100).toFixed(2)) : 0;

      setSummary({
        year,
        totalRevenue,
        totalExpense,
        profit,
        margin,
        monthly
      });
      setOccupancy(occupancyData);
      setMortality({
        totalAnimals,
        deadAnimals,
        mortalityRate
      });
    } catch (err: any) {
      setError('Nao foi possivel carregar os relatorios agora.');
      toast.error(err?.message || 'Erro ao carregar relatorios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-gray-200 rounded-lg"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatorios e Analises</h1>
        <p className="text-gray-500">Visao geral do negocio</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
        Relatorio calculado direto do Supabase. Se algum modulo ainda estiver sem dados, o menu segue acessivel normalmente.
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Resumo Financeiro {summary?.year}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">R$ {Number(summary?.totalRevenue || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Despesa Total</p>
            <p className="text-2xl font-bold text-red-600">R$ {Number(summary?.totalExpense || 0).toLocaleString('pt-BR')}</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Lucro</p>
            <p className="text-2xl font-bold text-blue-600">R$ {Number(summary?.profit || 0).toLocaleString('pt-BR')}</p>
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
              <XAxis dataKey="month" tickFormatter={(value) => MONTH_LABELS[value - 1]} />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
              <Bar dataKey="revenue" name="Receita" fill="#22c55e" />
              <Bar dataKey="expense" name="Despesa" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Ocupacao de Pastos</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="animalCount" name="Animais" fill="#3b82f6" />
              <Bar dataKey="occupancyRate" name="Ocupacao %" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Mortalidade</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500">Total de Animais</p>
            <p className="text-2xl font-bold">{mortality?.totalAnimals || 0}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-gray-500">Obitos</p>
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
