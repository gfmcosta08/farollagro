import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Tags() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ number: '', rfid: '', type: 'EAR_TAG' });

  useEffect(() => { fetchTags(); }, [search, filterStatus]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/tags', { params });
      setTags(response.data.data);
    } catch { toast.error('Erro ao carregar tags'); }
    finally { setLoading(false); }
  };

  const createTag = async () => {
    if (!formData.number) return;
    try {
      await api.post('/tags', formData);
      toast.success('Tag criada!');
      setShowModal(false);
      setFormData({ number: '', rfid: '', type: 'EAR_TAG' });
      fetchTags();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Erro ao criar tag'); }
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Excluir esta tag?')) return;
    try {
      await api.delete(`/tags/${id}`);
      toast.success('Tag removida');
      fetchTags();
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Brincos/Botoeiras</h1><p className="text-gray-500">{tags.length} tags cadastradas</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Nova Tag
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar número ou RFID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">Todos Status</option>
            <option value="AVAILABLE">Disponível</option>
            <option value="ACTIVE">Ativo</option>
            <option value="LOST">Perdido</option>
            <option value="DAMAGED">Danificado</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Animal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={6} className="px-6 py-8 text-center">Carregando...</td></tr>
            : tags.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center">Nenhuma tag encontrada</td></tr>
            : tags.map((tag) => (
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
                <td className="px-6 py-4 text-gray-500">{tag.animalTags?.[0]?.animal ? tag.animalTags[0].animal.id.slice(0, 8) : '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => deleteTag(tag.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nova Tag</h3>
            <div className="space-y-4">
              <div><label className="block text-sm mb-1">Número</label><input type="text" value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
              <div><label className="block text-sm mb-1">RFID (opcional)</label><input type="text" value={formData.rfid} onChange={(e) => setFormData({...formData, rfid: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
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
