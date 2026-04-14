import { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Tags() {
  const { tenant } = useAuth();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [animalByTag, setAnimalByTag] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({ number: '', rfid: '', type: 'EAR_TAG' });

  useEffect(() => {
    if (!tenant?.id) return;
    fetchTags();
  }, [tenant?.id, search, filterStatus]);

  const fetchTags = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('Tag')
        .select('id,number,rfid,type,status,createdAt')
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(200);

      if (search) {
        query = query.or(`number.ilike.%${search}%,rfid.ilike.%${search}%`);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error: tagsError } = await query;
      if (tagsError) throw tagsError;

      const safeTags = Array.isArray(data) ? data : [];
      setTags(safeTags);

      const tagIds = safeTags.map((tag) => tag.id);
      if (tagIds.length === 0) {
        setAnimalByTag({});
        return;
      }

      const { data: linksData, error: linksError } = await supabase
        .from('AnimalTag')
        .select('tagId,animalId,unlinkedAt')
        .in('tagId', tagIds)
        .is('unlinkedAt', null);

      if (linksError) throw linksError;

      const links = Array.isArray(linksData) ? linksData : [];
      const nextMap: Record<string, string> = {};
      links.forEach((link) => {
        if (!nextMap[link.tagId]) {
          nextMap[link.tagId] = link.animalId;
        }
      });
      setAnimalByTag(nextMap);
    } catch (err: any) {
      setTags([]);
      setAnimalByTag({});
      setError('Nao foi possivel carregar os brincos agora.');
      toast.error(err?.message || 'Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!tenant?.id) return;
    if (!formData.number.trim()) return;

    try {
      const payload = {
        tenantId: tenant.id,
        number: formData.number.trim(),
        rfid: formData.rfid.trim() || null,
        type: formData.type
      };

      const { error: insertError } = await supabase.from('Tag').insert(payload);
      if (insertError) throw insertError;

      toast.success('Brinco criado com sucesso');
      setShowModal(false);
      setFormData({ number: '', rfid: '', type: 'EAR_TAG' });
      fetchTags();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar tag');
    }
  };

  const deleteTag = async (id: string) => {
    if (!tenant?.id) return;
    if (!confirm('Excluir este brinco?')) return;

    try {
      const { error: updateError } = await supabase
        .from('Tag')
        .update({ deletedAt: new Date().toISOString() })
        .eq('id', id)
        .eq('tenantId', tenant.id);

      if (updateError) throw updateError;

      toast.success('Brinco removido');
      fetchTags();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Brincos/Botoeiras</h1>
          <p className="text-gray-500">{tags.length} tags cadastradas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Nova Tag
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar numero ou RFID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos Status</option>
            <option value="AVAILABLE">Disponivel</option>
            <option value="ACTIVE">Ativo</option>
            <option value="LOST">Perdido</option>
            <option value="DAMAGED">Danificado</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchTags} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Animal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">Carregando...</td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">Nenhuma tag encontrada</td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tag.number}</td>
                  <td className="px-6 py-4 text-gray-500">{tag.rfid || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{tag.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      tag.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                      tag.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      tag.status === 'LOST' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>{tag.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{animalByTag[tag.id] ? `${animalByTag[tag.id].slice(0, 8)}...` : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteTag(tag.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
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
            <h3 className="text-lg font-semibold mb-4">Nova Tag</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Numero</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(event) => setFormData({ ...formData, number: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">RFID (opcional)</label>
                <input
                  type="text"
                  value={formData.rfid}
                  onChange={(event) => setFormData({ ...formData, rfid: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="EAR_TAG">Botoeira</option>
                  <option value="RFID">RFID</option>
                  <option value="COLLAR">Coleira</option>
                  <option value="BOLUS">Bolus</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={createTag} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
