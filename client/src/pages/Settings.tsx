import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { tenant, user, initialize } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    state: '',
    areaUnit: 'HECTARE'
  });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.id) {
      setPageLoading(false);
      return;
    }
    fetchTenantSettings();
  }, [tenant?.id]);

  const fetchTenantSettings = async () => {
    if (!tenant?.id) return;

    setPageLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('Tenant')
        .select('name,phone,city,state,areaUnit')
        .eq('id', tenant.id)
        .single();

      if (queryError) throw queryError;

      setFormData({
        name: data?.name || '',
        phone: data?.phone || '',
        city: data?.city || '',
        state: data?.state || '',
        areaUnit: data?.areaUnit || 'HECTARE'
      });
    } catch (err: any) {
      setError('Nao foi possivel carregar as configuracoes agora.');
      toast.error(err?.message || 'Erro ao carregar configuracoes');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        areaUnit: formData.areaUnit
      };

      const { error: updateError } = await supabase
        .from('Tenant')
        .update(payload)
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      await initialize();
      toast.success('Configuracoes salvas com sucesso');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-64 bg-gray-200 rounded-lg"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-gray-500">Gerencie sua conta e preferencias</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>{error}</p>
          <button onClick={fetchTenantSettings} className="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Dados da Fazenda</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input
                type="text"
                value={formData.state}
                onChange={(event) => setFormData({ ...formData, state: event.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidade de Area</label>
            <select
              value={formData.areaUnit}
              onChange={(event) => setFormData({ ...formData, areaUnit: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="HECTARE">Hectare (ha)</option>
              <option value="ALQUEIRE_PAULISTA">Alqueire Paulista (2,42 ha)</option>
              <option value="ALQUEIRE_MINEIRO">Alqueire Mineiro (4,84 ha)</option>
              <option value="ALQUEIRE_BAIANO">Alqueire Baiano (9,68 ha)</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Sua Conta</h2>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Email:</span> <span className="font-medium">{user?.email}</span></p>
          <p><span className="text-gray-500">Nome:</span> <span className="font-medium">{user?.name}</span></p>
          <p><span className="text-gray-500">Perfil:</span> <span className="font-medium">{user?.role}</span></p>
        </div>
      </div>
    </div>
  );
}
