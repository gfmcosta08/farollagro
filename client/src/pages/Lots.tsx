import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Lots() {
  const { tenant } = useAuth();
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pastures, setPastures] = useState<any[]>([]);
  const [pastureNames, setPastureNames] = useState<Record<string, string>>({});
  const [animalsByLot, setAnimalsByLot] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({ name: '', pastureId: '', description: '' });

  useEffect(() => {
    if (!tenant?.id) return;
    fetchPastures();
    fetchLots();
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

  const fetchLots = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('Lot')
        .select('id,name,pastureId,description,status,createdAt')
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(200);

      if (queryError) throw queryError;

      const safeLots = Array.isArray(data) ? data : [];
      setLots(safeLots);

      const lotIds = safeLots.map((lot) => lot.id);
      if (lotIds.length === 0) {
        setAnimalsByLot({});
        return;
      }

      const { data: linksData, error: linksError } = await supabase
        .from('AnimalLot')
        .select('lotId,removedAt')
        .in('lotId', lotIds)
        .is('removedAt', null);

      if (linksError) throw linksError;

      const links = Array.isArray(linksData) ? linksData : [];
      const nextCount: Record<string, number> = {};
      links.forEach((link) => {
        nextCount[link.lotId] = (nextCount[link.lotId] || 0) + 1;
      });
      setAnimalsByLot(nextCount);
    } catch (err: any) {
      setLots([]);
      setAnimalsByLot({});
      setError('Nao foi possivel carregar os lotes agora.');
      toast.error(err?.message || 'Erro ao carregar lotes');
    } finally {
      setLoading(false);
    }
  };

  const createLot = async () => {
    if (!tenant?.id) return;
    if (!formData.name.trim()) return;

    try {
      const payload = {
        tenantId: tenant.id,
        name: formData.name.trim(),
        pastureId: formData.pastureId || null,
        description: formData.description.trim() || null
      };

      const { error: insertError } = await supabase.from('Lot').insert(payload);
      if (insertError) throw insertError;

      toast.success('Lote criado com sucesso');
      setShowModal(false);
      setFormData({ name: '', pastureId: '', description: '' });
      fetchLots();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar lote');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Lotes Zootecnicos</h1>
          <p className="text-gray-500">{lots.length} lotes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Lote
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchLots} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Carregando...</div>
        ) : lots.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">Nenhum lote encontrado</div>
        ) : (
          lots.map((lot) => (
            <div key={lot.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lot.name}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lot.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{lot.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                {lot.pastureId && <div className="flex justify-between"><span className="text-gray-500">Pasto</span><span className="font-medium">{pastureNames[lot.pastureId] || '-'}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Animais</span><span className="font-medium">{animalsByLot[lot.id] || 0}</span></div>
                {lot.description && <p className="text-gray-500 text-xs">{lot.description}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Lote</h3>
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
                <label className="block text-sm mb-1">Descricao</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createLot} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
