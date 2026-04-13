import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

type AnimalOrigin = 'BIRTH' | 'PURCHASE' | 'TRANSFER';
type AnimalSex = 'MALE' | 'FEMALE';
type AnimalSpecies = 'BOVINE' | 'EQUINE' | 'OVINE' | 'CAPRINE';

type CreateAnimalResponse = {
  id: string;
};

export default function NewAnimal() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sex: 'MALE' as AnimalSex,
    species: 'BOVINE' as AnimalSpecies,
    breed: '',
    birthDate: '',
    birthWeight: '',
    origin: 'BIRTH' as AnimalOrigin,
    sireId: '',
    damId: '',
    purchaseDate: '',
    purchasePrice: '',
    supplier: '',
    supplierDoc: '',
    gta: '',
    notes: ''
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.origin === 'PURCHASE') {
      if (!formData.purchaseDate || !formData.purchasePrice || !formData.supplier.trim()) {
        toast.error('Para aquisicao, informe data, valor e fornecedor');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sex: formData.sex,
        species: formData.species,
        origin: formData.origin
      };

      if (formData.breed.trim()) payload.breed = formData.breed.trim();
      if (formData.birthDate) payload.birthDate = new Date(formData.birthDate).toISOString();
      if (formData.birthWeight) payload.birthWeight = parseFloat(formData.birthWeight);
      if (formData.sireId.trim()) payload.sireId = formData.sireId.trim();
      if (formData.damId.trim()) payload.damId = formData.damId.trim();

      if (formData.origin === 'PURCHASE') {
        payload.purchase = {
          purchaseDate: new Date(formData.purchaseDate).toISOString(),
          price: parseFloat(formData.purchasePrice),
          supplier: formData.supplier.trim(),
          supplierDoc: formData.supplierDoc.trim() || undefined,
          gta: formData.gta.trim() || undefined,
          notes: formData.notes.trim() || undefined
        };
      }

      const response = await api.post<CreateAnimalResponse>('/animals', payload);
      toast.success('Animal cadastrado com sucesso');
      navigate(`/animals/${response.data.id}`);
    } catch (error: any) {
      const apiError = error?.response?.data?.error;
      if (Array.isArray(apiError)) {
        const firstValidation = apiError[0]?.message || 'Erro de validacao ao criar animal';
        toast.error(firstValidation);
      } else if (typeof apiError === 'string') {
        toast.error(apiError);
      } else {
        toast.error('Erro ao criar animal');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/animals')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Animal</h1>
          <p className="text-gray-500 dark:text-gray-400">Cadastro de animal e aquisicao</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Sexo *</label>
            <select
              value={formData.sex}
              onChange={(e) => setFormData((prev) => ({ ...prev, sex: e.target.value as AnimalSex }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
              required
            >
              <option value="MALE">Macho</option>
              <option value="FEMALE">Femea</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Especie</label>
            <select
              value={formData.species}
              onChange={(e) => setFormData((prev) => ({ ...prev, species: e.target.value as AnimalSpecies }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="BOVINE">Bovina</option>
              <option value="EQUINE">Equina</option>
              <option value="OVINE">Ovina</option>
              <option value="CAPRINE">Caprina</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Origem</label>
            <select
              value={formData.origin}
              onChange={(e) => setFormData((prev) => ({ ...prev, origin: e.target.value as AnimalOrigin }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="BIRTH">Nascimento</option>
              <option value="PURCHASE">Compra</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Raca</label>
            <input
              type="text"
              value={formData.breed}
              onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="Ex: Nelore"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Data de nascimento</label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Peso inicial (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.birthWeight}
              onChange={(e) => setFormData((prev) => ({ ...prev, birthWeight: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">ID do pai</label>
            <input
              type="text"
              value={formData.sireId}
              onChange={(e) => setFormData((prev) => ({ ...prev, sireId: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="UUID (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">ID da mae</label>
            <input
              type="text"
              value={formData.damId}
              onChange={(e) => setFormData((prev) => ({ ...prev, damId: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="UUID (opcional)"
            />
          </div>
        </div>

        {formData.origin === 'PURCHASE' && (
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/40 dark:bg-green-900/10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dados da aquisicao</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Data da compra *</label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Fornecedor *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Documento fornecedor</label>
                <input
                  type="text"
                  value={formData.supplierDoc}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supplierDoc: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GTA</label>
                <input
                  type="text"
                  value={formData.gta}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gta: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Observacoes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/animals')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Cadastrar animal'}
          </button>
        </div>
      </form>
    </div>
  );
}
