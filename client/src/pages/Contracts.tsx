import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', pastureId: '', billingType: 'FIXED', priceTotal: '', billingCycle: 'MONTHLY', startDate: '' });
  const [pastures, setPastures] = useState<any[]>([]);

  useEffect(() => { fetchContracts(); fetchPastures(); }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/contracts');
      setContracts(response.data.data);
    } catch { toast.error('Erro ao carregar contratos'); }
    finally { setLoading(false); }
  };

  const fetchPastures = async () => {
    try {
      const response = await api.get('/pastures', { params: { limit: 100 } });
      setPastures(response.data.data);
    } catch { /* ignore */ }
  };

  const createContract = async () => {
    if (!formData.name || !formData.pastureId || !formData.startDate) return;
    try {
      await api.post('/contracts', { ...formData, priceTotal: formData.priceTotal ? parseFloat(formData.priceTotal) : undefined, startDate: new Date(formData.startDate).toISOString() });
      toast.success('Contrato criado!');
      setShowModal(false);
      setFormData({ name: '', pastureId: '', billingType: 'FIXED', priceTotal: '', billingCycle: 'MONTHLY', startDate: '' });
      fetchContracts();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Erro ao criar contrato'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Contratos de Pastagem</h1><p className="text-gray-500">{contracts.length} contratos</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Contrato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <div className="col-span-full text-center py-8">Carregando...</div>
        : contracts.length === 0 ? <div className="col-span-full text-center py-8 text-gray-500">Nenhum contrato encontrado</div>
        : contracts.map((contract) => (
          <div key={contract.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{contract.name}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{contract.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Pasto</span><span className="font-medium">{contract.pasture?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="font-medium">{contract.billingType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Valor</span><span className="font-medium">R$ {(contract.priceTotal || 0).toLocaleString('pt-BR')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ciclo</span><span className="font-medium">{contract.billingCycle}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Início</span><span className="font-medium">{new Date(contract.startDate).toLocaleDateString('pt-BR')}</span></div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Contrato</h3>
            <div className="space-y-4">
              <div><label className="block text-sm mb-1">Nome</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
              <div><label className="block text-sm mb-1">Pasto</label>
                <select value={formData.pastureId} onChange={(e) => setFormData({...formData, pastureId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                  <option value="">Selecione...</option>
                  {pastures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm mb-1">Tipo de Cobrança</label>
                <select value={formData.billingType} onChange={(e) => setFormData({...formData, billingType: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                  <option value="FIXED">Fixo</option>
                  <option value="PER_HEAD">Por Cabeça</option>
                  <option value="PER_AREA">Por Área</option>
                  <option value="HYBRID">Híbrido</option>
                </select>
              </div>
              <div><label className="block text-sm mb-1">Valor Total</label><input type="number" value={formData.priceTotal} onChange={(e) => setFormData({...formData, priceTotal: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
              <div><label className="block text-sm mb-1">Ciclo</label>
                <select value={formData.billingCycle} onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div><label className="block text-sm mb-1">Data de Início</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createContract} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
