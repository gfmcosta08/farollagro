import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Beef, Male, Female, Eye, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export default function Animals() {
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    fetchAnimals();
  }, [search, filterSex, filterStatus, page]);

  const fetchAnimals = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (filterSex) params.sex = filterSex;
      if (filterStatus) params.status = filterStatus;

      const response = await api.get('/animals', { params });
      setAnimals(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnimal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este animal?')) return;
    try {
      await api.delete(`/animals/${id}`);
      toast.success('Animal excluído com sucesso');
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, raça..."
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
            <option value="FEMALE">Fêmea</option>
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Animal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sexo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Raça</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brinco</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : animals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhum animal encontrado</td>
                </tr>
              ) : (
                animals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <Beef size={20} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{animal.id.slice(0, 8)}...</p>
                          <p className="text-xs text-gray-500">{animal.birthDate ? new Date(animal.birthDate).toLocaleDateString('pt-BR') : 'Sem data'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        {animal.sex === 'MALE' ? <Male size={16} /> : <Female size={16} />}
                        <span className="text-sm">{animal.sex === 'MALE' ? 'Macho' : 'Fêmea'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{animal.breed || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {animal.tags?.[0]?.tag?.number || '-'}
                    </td>
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
                        <Link to={`/animals/${animal.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                          <Eye size={18} />
                        </Link>
                        <button onClick={() => deleteAnimal(animal.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
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

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">Página {pagination.page} de {pagination.pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.pages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
