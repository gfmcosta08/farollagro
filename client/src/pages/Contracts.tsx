import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Contracts() {
  const { tenant } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pastures, setPastures] = useState<any[]>([]);
  const [pastureNames, setPastureNames] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    pastureId: '',
    billingType: 'FIXED',
    priceTotal: '',
    billingCycle: 'MONTHLY',
    startDate: ''
  });

  useEffect(() => {
    if (!tenant?.id) return;
    fetchPastures();
    fetchContracts();
  }, [tenant?.id]);

  const fetchPastures = async () => {
    if (!tenant?.id) return;

    const { data, error: queryError } = await supabase
      .from('Pasture')
      .select('id,name')
      .eq('tenantId', tenant.id)
      .is('deletedAt', null)
      .order('name', { ascending: true })
      .limit(300);

    if (queryError) {
      return;
    }

    const safePastures = Array.isArray(data) ? data : [];
    setPastures(safePastures);

    const nextMap: Record<string, string> = {};
    safePastures.forEach((pasture) => {
      nextMap[pasture.id] = pasture.name;
    });
    setPastureNames(nextMap);
  };

  const fetchContracts = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('Contract')
        .select('id,name,pastureId,billingType,priceTotal,billingCycle,startDate,status,createdAt')
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(200);

      if (queryError) throw queryError;

      setContracts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setContracts([]);
      setError('Nao foi possivel carregar os contratos agora.');
      toast.error(err?.message || 'Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const createContract = async () => {
    if (!tenant?.id) return;
    if (!formData.name.trim() || !formData.pastureId || !formData.startDate) return;

    try {
      const payload = {
        tenantId: tenant.id,
        name: formData.name.trim(),
        pastureId: formData.pastureId,
        billingType: formData.billingType,
        priceTotal: formData.priceTotal ? Number(formData.priceTotal) : null,
        billingCycle: formData.billingCycle,
        startDate: new Date(formData.startDate).toISOString()
      };

      const { error: insertError } = await supabase.from('Contract').insert(payload);
      if (insertError) throw insertError;

      toast.success('Contrato criado com sucesso');
      setShowModal(false);
      setFormData({
        name: '',
        pastureId: '',
        billingType: 'FIXED',
        priceTotal: '',
        billingCycle: 'MONTHLY',
        startDate: ''
      });
      fetchContracts();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar contrato');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Contratos de Pastagem</h1>
          <p className="text-gray-500">{contracts.length} contratos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Contrato
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchContracts} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Carregando...</div>
        ) : contracts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">Nenhum contrato encontrado</div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{contract.name}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{contract.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Pasto</span><span className="font-medium">{pastureNames[contract.pastureId] || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="font-medium">{contract.billingType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor</span><span className="font-medium">R$ {Number(contract.priceTotal || 0).toLocaleString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ciclo</span><span className="font-medium">{contract.billingCycle}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Inicio</span><span className="font-medium">{contract.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '-'}</span></div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Contrato</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Pasto</label>
                <select
                  value={formData.pastureId}
                  onChange={(event) => setFormData({ ...formData, pastureId: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Selecione...</option>
                  {pastures.map((pasture) => <option key={pasture.id} value={pasture.id}>{pasture.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Tipo de Cobranca</label>
                <select
                  value={formData.billingType}
                  onChange={(event) => setFormData({ ...formData, billingType: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="FIXED">Fixo</option>
                  <option value="PER_HEAD">Por Cabeca</option>
                  <option value="PER_AREA">Por Area</option>
                  <option value="HYBRID">Hibrido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Valor Total</label>
                <input
                  type="number"
                  value={formData.priceTotal}
                  onChange={(event) => setFormData({ ...formData, priceTotal: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Ciclo</label>
                <select
                  value={formData.billingCycle}
                  onChange={(event) => setFormData({ ...formData, billingCycle: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUAL">Semestral</option>
                  <option value="ANNUAL">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Data de Inicio</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
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
