import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type AnimalOrigin = 'BIRTH' | 'PURCHASE' | 'TRANSFER';
type AnimalSex = 'MALE' | 'FEMALE';
type AnimalSpecies = 'BOVINE' | 'EQUINE' | 'OVINE' | 'CAPRINE';

export default function NewAnimal() {
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
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
    if (!tenant?.id || !user?.id) {
      toast.error('Sessao invalida. Faca login novamente.');
      return;
    }

    if (formData.origin === 'PURCHASE' && (!formData.purchaseDate || !formData.purchasePrice || !formData.supplier.trim())) {
      toast.error('Para aquisicao, informe data, valor e fornecedor');
      return;
    }

    setSaving(true);
    try {
      const { data: animal, error: animalError } = await supabase
        .from('Animal')
        .insert({
          tenantId: tenant.id,
          species: formData.species,
          breed: formData.breed.trim() || null,
          sex: formData.sex,
          birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
          birthWeight: formData.birthWeight ? parseFloat(formData.birthWeight) : null,
          origin: formData.origin,
          sireId: formData.sireId.trim() || null,
          damId: formData.damId.trim() || null,
          status: 'ACTIVE'
        })
        .select('id,species,breed,sex,birthDate,origin,sireId,damId')
        .single();

      if (animalError || !animal) {
        throw animalError || new Error('Erro ao criar animal');
      }

      if (formData.origin === 'PURCHASE') {
        const purchaseDateIso = new Date(formData.purchaseDate).toISOString();
        const purchasePrice = parseFloat(formData.purchasePrice);

        const { data: purchase, error: purchaseError } = await supabase
          .from('Purchase')
          .insert({
            tenantId: tenant.id,
            animalId: animal.id,
            purchaseDate: purchaseDateIso,
            price: purchasePrice,
            supplier: formData.supplier.trim(),
            supplierDoc: formData.supplierDoc.trim() || null,
            gta: formData.gta.trim() || null,
            notes: formData.notes.trim() || null
          })
          .select('id')
          .single();

        if (purchaseError) throw purchaseError;

        const { error: financeError } = await supabase.from('Finance').insert({
          tenantId: tenant.id,
          type: 'EXPENSE',
          category: 'AQUISICAO_ANIMAL',
          description: `Aquisicao de animal ${animal.id.slice(0, 8)}`,
          amount: purchasePrice,
          date: purchaseDateIso,
          animalId: animal.id,
          notes: formData.notes.trim() || null
        });

        if (financeError) throw financeError;

        const { error: purchaseEventError } = await supabase.from('Event').insert({
          tenantId: tenant.id,
          animalId: animal.id,
          type: 'PURCHASE',
          data: {
            purchaseId: purchase?.id,
            purchaseDate: purchaseDateIso,
            price: purchasePrice,
            supplier: formData.supplier.trim(),
            species: animal.species,
            breed: animal.breed,
            sex: animal.sex,
            birthDate: animal.birthDate,
            sireId: animal.sireId,
            damId: animal.damId
          },
          userId: user.id
        });

        if (purchaseEventError) throw purchaseEventError;
      } else {
        const { error: eventError } = await supabase.from('Event').insert({
          tenantId: tenant.id,
          animalId: animal.id,
          type: formData.origin === 'BIRTH' ? 'BIRTH' : 'PURCHASE',
          data: {
            species: animal.species,
            breed: animal.breed,
            sex: animal.sex,
            birthDate: animal.birthDate,
            sireId: animal.sireId,
            damId: animal.damId,
            origin: formData.origin
          },
          userId: user.id
        });
        if (eventError) throw eventError;
      }

      toast.success('Animal cadastrado com sucesso');
      navigate(`/animals/${animal.id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar animal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/animals')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
          <button type="button" onClick={() => navigate('/animals')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60" disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar animal'}
          </button>
        </div>
      </form>
    </div>
  );
}
