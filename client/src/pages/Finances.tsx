import { useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Finances() {
  const { tenant } = useAuth();
  const [finances, setFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!tenant?.id) return;
    fetchFinances();
  }, [tenant?.id]);

  const fetchFinances = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('Finance')
        .select('id,type,category,description,amount,date,status,createdAt')
        .eq('tenantId', tenant.id)
        .order('date', { ascending: false })
        .limit(300);

      if (queryError) throw queryError;

      setFinances(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFinances([]);
      setError('Nao foi possivel carregar as financas agora.');
      toast.error(err?.message || 'Erro ao carregar financas');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const base = { revenue: 0, expense: 0 };
    finances.forEach((item) => {
      if (item.status === 'CANCELLED') return;
      if (item.type === 'REVENUE') base.revenue += Number(item.amount || 0);
      if (item.type === 'EXPENSE') base.expense += Number(item.amount || 0);
    });
    return base;
  }, [finances]);

  const createFinance = async () => {
    if (!tenant?.id) return;
    if (!formData.category.trim() || !formData.amount) return;

    try {
      const payload = {
        tenantId: tenant.id,
        type: formData.type,
        category: formData.category.trim(),
        description: formData.description.trim() || formData.category.trim(),
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString()
      };

      const { error: insertError } = await supabase.from('Finance').insert(payload);
      if (insertError) throw insertError;

      toast.success('Registro criado com sucesso');
      setShowModal(false);
      setFormData({
        type: 'EXPENSE',
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchFinances();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar registro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financas</h1>
          <p className="text-gray-500">Controle de receitas e despesas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Lancamento
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchFinances} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full"><TrendingUp size={24} className="text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Receita</p><p className="text-2xl font-bold text-green-600">R$ {totals.revenue.toLocaleString('pt-BR')}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full"><TrendingDown size={24} className="text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Despesa</p><p className="text-2xl font-bold text-red-600">R$ {totals.expense.toLocaleString('pt-BR')}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full"><span className="text-2xl">R$</span></div>
            <div>
              <p className="text-sm text-gray-500">Saldo</p>
              <p className={`text-2xl font-bold ${totals.revenue - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(totals.revenue - totals.expense).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">Carregando...</td>
              </tr>
            ) : finances.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">Nenhum registro encontrado</td>
              </tr>
            ) : (
              finances.map((finance) => (
                <tr key={finance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-500">{finance.date ? new Date(finance.date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${finance.type === 'REVENUE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {finance.type === 'REVENUE' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{finance.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{finance.description}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${finance.type === 'REVENUE' ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {Number(finance.amount || 0).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Lancamento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="REVENUE">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Ex: Racao, Vacina, Venda"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Descricao</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createFinance} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
