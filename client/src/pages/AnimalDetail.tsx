import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Beef, Tag, Scale, Heart, DollarSign, Edit, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    if (!id) return;

    if (id === 'new') {
      navigate('/animals/new', { replace: true });
      return;
    }

    fetchAnimal(id);
  }, [id, navigate]);

  const fetchAnimal = async (animalId: string) => {
    try {
      const response = await api.get(`/animals/${animalId}`);
      setAnimal(response.data);
    } catch (error) {
      if (animalId === 'new') return;
      toast.error('Erro ao carregar animal');
      navigate('/animals');
    } finally {
      setLoading(false);
    }
  };

  const linkTag = async () => {
    if (!selectedTag) return;
    try {
      await api.post(`/animals/${id}/tags`, { tagId: selectedTag });
      toast.success('Tag vinculada com sucesso!');
      setShowTagModal(false);
      fetchAnimal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao vincular tag');
    }
  };

  const loadAvailableTags = async () => {
    try {
      const response = await api.get('/tags', { params: { status: 'AVAILABLE', limit: 100 } });
      setAvailableTags(response.data.data);
      setShowTagModal(true);
    } catch (error) {
      toast.error('Erro ao carregar tags');
    }
  };

  if (loading) return <div className="animate-pulse">Carregando...</div>;
  if (!animal) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/animals')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Animal</h1>
          <p className="text-gray-500 dark:text-gray-400">ID: {animal.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Beef size={32} className="text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {animal.sex === 'MALE' ? 'Macho' : 'Fêmea'} {animal.breed && `- ${animal.breed}`}
              </p>
              <p className="text-sm text-gray-500">Nascimento: {animal.birthDate ? new Date(animal.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Status</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                animal.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {animal.status}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Espécie</span>
              <span className="text-gray-900 dark:text-white">{animal.species}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Origem</span>
              <span className="text-gray-900 dark:text-white">{animal.origin}</span>
            </div>
            {animal.sire && (
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Pai</span>
                <span className="text-gray-900 dark:text-white">{animal.sire.id.slice(0, 8)}...</span>
              </div>
            )}
            {animal.dam && (
              <div className="flex justify-between">
                <span className="text-gray-500">Mãe</span>
                <span className="text-gray-900 dark:text-white">{animal.dam.id.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Brincos</h3>
            </div>
            <button
              onClick={loadAvailableTags}
              className="text-sm text-green-600 hover:underline flex items-center gap-1"
            >
              <LinkIcon size={14} /> Vincular
            </button>
          </div>

          {animal.tags && animal.tags.length > 0 ? (
            <div className="space-y-2">
              {animal.tags.map((at: any) => (
                <div key={at.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{at.tag.number}</p>
                    <p className="text-xs text-gray-500">{at.tag.type} {at.tag.rfid && `- RFID: ${at.tag.rfid}`}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(at.linkedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum brinco vinculado</p>
          )}
        </div>

        {/* Weights Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pesagens</h3>
            </div>
          </div>

          {animal.weights && animal.weights.length > 0 ? (
            <div className="space-y-2">
              {animal.weights.map((w: any) => (
                <div key={w.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{w.weight} kg</p>
                    <p className="text-xs text-gray-500">{w.weightType}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(w.weightDate).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma pesagem registrada</p>
          )}
        </div>

        {/* Events Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={20} className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eventos</h3>
          </div>

          {animal.events && animal.events.length > 0 ? (
            <div className="space-y-2">
              {animal.events.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{e.type}</p>
                    <p className="text-xs text-gray-500">{e.data && JSON.stringify(e.data)}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(e.occurredAt).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum evento registrado</p>
          )}
        </div>
      </div>

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vincular Brinco</h3>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            >
              <option value="">Selecione um brinco</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.number} {tag.rfid && `(${tag.rfid})`}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTagModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={linkTag} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Vincular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
