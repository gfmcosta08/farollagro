import { useEffect, useState } from 'react';
import { Plus, Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Pastures() {
  const { tenant } = useAuth();
  const [pastures, setPastures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', area: '', forageType: '', location: '', capacityUA: '' });

  useEffect(() => {
    if (!tenant?.id) return;
    fetchPastures();
  }, [tenant?.id, search]);

  const fetchPastures = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('Pasture')
        .select('id,name,area,forageType,location,capacityUA,status,createdAt')
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(200);

      if (search) {
        query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%,forageType.ilike.%${search}%`);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setPastures(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setPastures([]);
      setError('Nao foi possivel carregar os pastos agora.');
      toast.error(err?.message || 'Erro ao carregar pastos');
    } finally {
      setLoading(false);
    }
  };

  const createPasture = async () => {
    if (!tenant?.id) return;
    if (!formData.name.trim() || !formData.area) return;

    try {
      const payload = {
        tenantId: tenant.id,
        name: formData.name.trim(),
        area: Number(formData.area),
        forageType: formData.forageType.trim() || null,
        location: formData.location.trim() || null,
        capacityUA: formData.capacityUA ? Number(formData.capacityUA) : null
      };

      const { error: insertError } = await supabase.from('Pasture').insert(payload);
      if (insertError) throw insertError;

      toast.success('Pasto criado com sucesso');
      setShowModal(false);
      setFormData({ name: '', area: '', forageType: '', location: '', capacityUA: '' });
      fetchPastures();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar pasto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pastos/Pastagens</h1>
          <p className="text-gray-500">{pastures.length} pastos cadastrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Pasto
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pasto..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchPastures} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Carregando...</div>
        ) : pastures.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">Nenhum pasto encontrado</div>
        ) : (
          pastures.map((pasture) => (
            <div key={pasture.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pasture.name}</h3>
                  {pasture.location && <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {pasture.location}</p>}
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${pasture.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                  {pasture.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Area</span><span className="font-medium">{pasture.area} ha</span></div>
                {pasture.forageType && <div className="flex justify-between"><span className="text-gray-500">Forrageira</span><span className="font-medium">{pasture.forageType}</span></div>}
                {pasture.capacityUA && <div className="flex justify-between"><span className="text-gray-500">Capacidade</span><span className="font-medium">{pasture.capacityUA} UA</span></div>}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Pasto</h3>
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
                <label className="block text-sm mb-1">Area (ha)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.area}
                  onChange={(event) => setFormData({ ...formData, area: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Forrageira</label>
                <input
                  type="text"
                  value={formData.forageType}
                  onChange={(event) => setFormData({ ...formData, forageType: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Brachiaria, Panicum..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Localizacao</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Capacidade (UA)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.capacityUA}
                  onChange={(event) => setFormData({ ...formData, capacityUA: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createPasture} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
