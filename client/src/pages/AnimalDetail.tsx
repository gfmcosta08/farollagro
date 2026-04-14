import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Beef, Tag, Scale, Heart, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const eventLabels: Record<string, string> = {
  BIRTH: 'Nascimento',
  PURCHASE: 'Compra',
  TAG_ATTACHED: 'Brinco vinculado',
  TAG_DETACHED: 'Brinco removido',
  WEIGHING: 'Pesagem',
  DEATH: 'Obito',
  SALE: 'Venda',
  MOVEMENT: 'Movimentacao'
};

const formatCurrency = (value: unknown) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
};

const describeEvent = (event: any) => {
  const data = event?.data || {};

  switch (event?.type) {
    case 'BIRTH':
      return data.birthDate
        ? `Nascimento em ${new Date(data.birthDate).toLocaleDateString('pt-BR')}`
        : 'Nascimento registrado';
    case 'PURCHASE': {
      const supplier = data.supplier ? `Fornecedor: ${data.supplier}` : null;
      const price = formatCurrency(data.price);
      if (supplier && price) return `${supplier} - Valor: ${price}`;
      if (supplier) return supplier;
      if (price) return `Valor: ${price}`;
      return 'Compra registrada';
    }
    case 'TAG_ATTACHED':
      return data.tagId ? `Tag vinculada (${String(data.tagId).slice(0, 8)}...)` : 'Tag vinculada';
    case 'TAG_DETACHED':
      return data.tagId ? `Tag removida (${String(data.tagId).slice(0, 8)}...)` : 'Tag removida';
    case 'WEIGHING':
      return data.weight ? `Peso registrado: ${data.weight} kg` : 'Pesagem registrada';
    case 'SALE': {
      const salePrice = formatCurrency(data.price);
      return salePrice ? `Venda registrada - ${salePrice}` : 'Venda registrada';
    }
    case 'DEATH':
      return data.cause ? `Causa: ${data.cause}` : 'Obito registrado';
    default: {
      if (typeof data === 'object' && Object.keys(data).length > 0) {
        const summary = Object.entries(data)
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(' | ');
        return summary || 'Evento registrado';
      }
      return 'Evento registrado';
    }
  }
};

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
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
  }, [id, tenant?.id, navigate]);

  const fetchAnimal = async (animalId: string) => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data: baseAnimal, error: animalError } = await supabase
        .from('Animal')
        .select('id,sex,breed,birthDate,status,species,origin,sireId,damId')
        .eq('id', animalId)
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .single();

      if (animalError || !baseAnimal) throw animalError || new Error('Animal nao encontrado');

      const [weightsRes, eventsRes, animalTagsRes] = await Promise.all([
        supabase
          .from('Weight')
          .select('id,weight,weightType,weightDate')
          .eq('animalId', animalId)
          .eq('tenantId', tenant.id)
          .order('weightDate', { ascending: false })
          .limit(20),
        supabase
          .from('Event')
          .select('id,type,data,occurredAt')
          .eq('animalId', animalId)
          .eq('tenantId', tenant.id)
          .order('occurredAt', { ascending: false })
          .limit(20),
        supabase
          .from('AnimalTag')
          .select('id,tagId,linkedAt,unlinkedAt')
          .eq('animalId', animalId)
          .is('unlinkedAt', null)
      ]);

      if (weightsRes.error) throw weightsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (animalTagsRes.error) throw animalTagsRes.error;

      const activeAnimalTags = animalTagsRes.data || [];
      const tagIds = activeAnimalTags.map((at) => at.tagId);
      let tagsMap = new Map<string, any>();

      if (tagIds.length > 0) {
        const { data: tagsData, error: tagsError } = await supabase
          .from('Tag')
          .select('id,number,type,rfid')
          .in('id', tagIds);
        if (tagsError) throw tagsError;
        tagsMap = new Map((tagsData || []).map((t) => [t.id, t]));
      }

      setAnimal({
        ...baseAnimal,
        tags: activeAnimalTags.map((at) => ({
          id: at.id,
          linkedAt: at.linkedAt,
          tag: tagsMap.get(at.tagId)
        })),
        weights: weightsRes.data || [],
        events: eventsRes.data || []
      });
    } catch (error) {
      toast.error('Erro ao carregar animal');
      navigate('/animals');
    } finally {
      setLoading(false);
    }
  };

  const linkTag = async () => {
    if (!tenant?.id || !id || !selectedTag || !user?.id) return;
    try {
      const { error: createLinkError } = await supabase.from('AnimalTag').insert({
        animalId: id,
        tagId: selectedTag
      });
      if (createLinkError) throw createLinkError;

      const { error: tagUpdateError } = await supabase
        .from('Tag')
        .update({ status: 'ACTIVE' })
        .eq('id', selectedTag)
        .eq('tenantId', tenant.id);

      if (tagUpdateError) throw tagUpdateError;

      const { error: eventError } = await supabase.from('Event').insert({
        tenantId: tenant.id,
        animalId: id,
        type: 'TAG_ATTACHED',
        data: { tagId: selectedTag },
        userId: user.id
      });
      if (eventError) throw eventError;

      toast.success('Tag vinculada com sucesso!');
      setShowTagModal(false);
      setSelectedTag('');
      fetchAnimal(id);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao vincular tag');
    }
  };

  const loadAvailableTags = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from('Tag')
        .select('id,number,rfid,type')
        .eq('tenantId', tenant.id)
        .eq('status', 'AVAILABLE')
        .is('deletedAt', null)
        .order('number', { ascending: true })
        .limit(100);

      if (error) throw error;
      setAvailableTags(data || []);
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Beef size={32} className="text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {animal.sex === 'MALE' ? 'Macho' : 'Femea'} {animal.breed && `- ${animal.breed}`}
              </p>
              <p className="text-sm text-gray-500">
                Nascimento: {animal.birthDate ? new Date(animal.birthDate).toLocaleDateString('pt-BR') : 'Nao informado'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">{animal.status}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Especie</span>
              <span className="text-gray-900 dark:text-white">{animal.species}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-gray-500">Origem</span>
              <span className="text-gray-900 dark:text-white">{animal.origin}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Brincos</h3>
            </div>
            <button onClick={loadAvailableTags} className="text-sm text-green-600 hover:underline flex items-center gap-1">
              <LinkIcon size={14} /> Vincular
            </button>
          </div>

          {animal.tags && animal.tags.length > 0 ? (
            <div className="space-y-2">
              {animal.tags.map((at: any) => (
                <div key={at.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{at.tag?.number || '-'}</p>
                    <p className="text-xs text-gray-500">{at.tag?.type || '-'} {at.tag?.rfid && `- RFID: ${at.tag.rfid}`}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(at.linkedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum brinco vinculado</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={20} className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pesagens</h3>
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
                    <p className="font-medium text-gray-900 dark:text-white">{eventLabels[e.type] || e.type}</p>
                    <p className="text-xs text-gray-500">{describeEvent(e)}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(e.occurredAt).toLocaleDateString('pt-BR')} {new Date(e.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum evento registrado</p>
          )}
        </div>
      </div>

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
                <option key={tag.id} value={tag.id}>
                  {tag.number} {tag.rfid && `(${tag.rfid})`}
                </option>
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
