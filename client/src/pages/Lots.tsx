import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Lots() {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', pastureId: '', description: '' });
  const [pastures, setPastures] = useState<any[]>([]);

  useEffect(() => { fetchLots(); fetchPastures(); }, []);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lots');
      setLots(response.data.data);
    } catch { toast.error('Erro ao carregar lotes'); }
    finally { setLoading(false); }
  };

  const fetchPastures = async () => {
    try {
      const response = await api.get('/pastures', { params: { limit: 100 } });
      setPastures(response.data.data);
    } catch { /* ignore */ }
  };

  const createLot = async () => {
    if (!formData.name) return;
    try {
      await api.post('/lots', formData);
      toast.success('Lote criado!');
      setShowModal(false);
      setFormData({ name: '', pastureId: '', description: '' });
      fetchLots();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Erro ao criar lote'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Lotes Zootécnicos</h1><p className="text-gray-500">{lots.length} lotes</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Plus size={20} /> Novo Lote
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center py-8">Carregando...</div>
        : lots.length === 0 ? <div className="col-span-full text-center py-8 text-gray-500">Nenhum lote encontrado</div>
        : lots.map((lot) => (
          <div key={lot.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lot.name}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lot.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{lot.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              {lot.pasture && <div className="flex justify-between"><span className="text-gray-500">Pasto</span><span className="font-medium">{lot.pasture.name}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Animais</span><span className="font-medium">{lot.animals?.length || 0}</span></div>
              {lot.description && <p className="text-gray-500 text-xs">{lot.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Novo Lote</h3>
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
              <div><label className="block text-sm mb-1">Descrição</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" /></div>
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
