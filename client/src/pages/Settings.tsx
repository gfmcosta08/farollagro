import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import api from '../services/api';

export default function Settings() {
  const { tenant, user } = useAuth();
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    phone: '',
    city: '',
    state: '',
    areaUnit: tenant?.areaUnit || 'HECTARE'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/tenants', formData);
      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Configurações</h1><p className="text-gray-500">Gerencie sua conta e preferências</p></div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Dados da Fazenda</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div><label className="block text-sm font-medium mb-1">Nome</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
          <div><label className="block text-sm font-medium mb-1">Telefone</label>
            <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Cidade</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
            <div><label className="block text-sm font-medium mb-1">Estado</label>
              <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Unidade de Área</label>
            <select value={formData.areaUnit} onChange={(e) => setFormData({...formData, areaUnit: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="HECTARE">Hectare (ha)</option>
              <option value="ALQUEIRE_PAULISTA">Alqueire Paulista (2,42 ha)</option>
              <option value="ALQUEIRE_MINEIRO">Alqueire Mineiro (4,84 ha)</option>
              <option value="ALQUEIRE_BAIANO">Alqueire Baiano (9,68 ha)</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
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
