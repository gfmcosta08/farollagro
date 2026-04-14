import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Beef, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Animals() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const [animals, setAnimals] = useState<any[]>([]);
  const [tagByAnimal, setTagByAnimal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchAnimals();
  }, [tenant?.id, search, filterSex, filterStatus, page]);

  const fetchAnimals = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const limit = 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('Animal')
        .select('id,sex,breed,status,birthDate,createdAt', { count: 'exact' })
        .eq('tenantId', tenant.id)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(`id.ilike.%${search}%,breed.ilike.%${search}%`);
      }
      if (filterSex) {
        query = query.eq('sex', filterSex);
      }
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const total = count || 0;
      const safeAnimals = data || [];
      setAnimals(safeAnimals);

      const animalIds = safeAnimals.map((animal) => animal.id);
      if (animalIds.length === 0) {
        setTagByAnimal({});
      } else {
        const { data: linksData, error: linksError } = await supabase
          .from('AnimalTag')
          .select('animalId,tagId,linkedAt,unlinkedAt')
          .in('animalId', animalIds)
          .is('unlinkedAt', null)
          .order('linkedAt', { ascending: false });

        if (linksError) throw linksError;

        const safeLinks = linksData || [];
        const selectedLinkByAnimal: Record<string, string> = {};
        const tagIds: string[] = [];

        safeLinks.forEach((link) => {
          if (!selectedLinkByAnimal[link.animalId]) {
            selectedLinkByAnimal[link.animalId] = link.tagId;
            tagIds.push(link.tagId);
          }
        });

        if (tagIds.length > 0) {
          const { data: tagsData, error: tagsError } = await supabase
            .from('Tag')
            .select('id,number')
            .in('id', tagIds);

          if (tagsError) throw tagsError;

          const tagNumberById: Record<string, string> = {};
          (tagsData || []).forEach((tag) => {
            tagNumberById[tag.id] = tag.number;
          });

          const nextTagByAnimal: Record<string, string> = {};
          Object.entries(selectedLinkByAnimal).forEach(([animalId, tagId]) => {
            if (tagNumberById[tagId]) {
              nextTagByAnimal[animalId] = tagNumberById[tagId];
            }
          });

          setTagByAnimal(nextTagByAnimal);
        } else {
          setTagByAnimal({});
        }
      }

      setPagination({
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      });
    } catch (error) {
      toast.error('Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnimal = async (id: string) => {
    if (!tenant?.id) return;
    if (!confirm('Tem certeza que deseja excluir este animal?')) return;
    try {
      const { error } = await supabase
        .from('Animal')
        .update({ deletedAt: new Date().toISOString() })
        .eq('id', id)
        .eq('tenantId', tenant.id);

      if (error) throw error;
      toast.success('Animal excluido com sucesso');
      fetchAnimals();
    } catch (error) {
      toast.error('Erro ao excluir animal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Animais</h1>
          <p className="text-gray-500 dark:text-gray-400">{pagination?.total || 0} animais cadastrados</p>
        </div>
        <Link
          to="/animals/new"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Novo Animal
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, raca..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={filterSex}
            onChange={(e) => setFilterSex(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os Sexos</option>
            <option value="MALE">Macho</option>
            <option value="FEMALE">Femea</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Todos os Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SOLD">Vendido</option>
            <option value="DEAD">Morto</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brinco</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sexo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Raca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : animals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum animal encontrado</td>
                </tr>
              ) : (
                animals.map((animal) => (
                  <tr
                    key={animal.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => navigate(`/animals/${animal.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <Beef size={20} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{tagByAnimal[animal.id] || 'Sem brinco'}</p>
                          <p className="text-xs text-gray-500">
                            {animal.birthDate ? new Date(animal.birthDate).toLocaleDateString('pt-BR') : 'Sem data'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <span className="text-sm">{animal.sex === 'MALE' ? 'Macho' : 'Femea'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{animal.breed || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        animal.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        animal.status === 'SOLD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {animal.status === 'ACTIVE' ? 'Ativo' : animal.status === 'SOLD' ? 'Vendido' : 'Morto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteAnimal(animal.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">Pagina {pagination.page} de {pagination.pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.pages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
