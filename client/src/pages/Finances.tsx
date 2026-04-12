import { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Finances() {
  const [finances, setFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [totals, setTotals] = useState({ revenue: 0, expense: 0 });
  const [formData, setFormData] = useState({ type: 'EXPENSE', category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { fetchFinances(); }, []);

  const fetchFinances = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finances', { params: { limit: 100 } });
      setFinances(response.data.data);
      setTotals(response.data.totals);
    } catch { toast.error('Erro ao carregar finanças'); }
    finally { setLoading(false); }
  };

  const createFinance = async () => {
    if (!formData.category || !formData.amount) return;
    try {
      await api.post('/finances', { ...formData, amount: parseFloat(formData.amount), date: new Date(formData.date).toISOString() });
      toast.success('Registro criado!');
      setShowModal(false);
      setFormData({ type: 'EXPENSE', category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
      fetchFinances();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Erro ao criar registro'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold">Finanças</h1><p className="text-gray-500">Controle de receitas e despesas</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      {/* Summary Cards */}
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
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full"><span className="text-2xl">💰</span></div>
            <div><p className="text-sm text-gray-500">Saldo</p><p className={`text-2xl font-bold ${totals.revenue - totals.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {(totals.revenue - totals.expense).toLocaleString('pt-BR')}</p></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center">Carregando...</td></tr>
            : finances.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center">Nenhum registro encontrado</td></tr>
            : finances.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(f.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${f.type === 'REVENUE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{f.type === 'REVENUE' ? 'Receita' : 'Despesa'}</span></td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{f.category}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{f.description}</td>
                <td className={`px-6 py-4 text-right font-semibold ${f.type === 'REVENUE' ? 'text-green-600' : 'text-red-600'}`}>R$ {f.amount.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Lançamento</h3>
            <div className="space-y-4">
              <div><label className="block text-sm mb-1">Tipo</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                  <option value="EXPENSE">Despesa</option>
                  <option value="REVENUE">Receita</option>
                </select>
              </div>
              <div><label className="block text-sm mb-1">Categoria</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" placeholder="Ex: Salário, Ração, Vacina..." />
              </div>
              <div><label className="block text-sm mb-1">Descrição</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div><label className="block text-sm mb-1">Valor (R$)</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div><label className="block text-sm mb-1">Data</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
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
