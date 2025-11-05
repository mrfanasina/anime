import React, { useEffect, useState } from 'react';

export default function RdvFormTest() {
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [medecins] = useState([{ matricule: 'M1', nom: 'Dr Jean', type: 'Généraliste' }]);
  const [cabinets] = useState([{ lieu: 'C1', nom: 'Cabinet Central' }]);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [form, setForm] = useState({ numSec: '', date: '', heureDeb: '', heureFin: '', matricule: '', lieu: '' });
  const [newPatientForm, setNewPatientForm] = useState({ nom: '', numSec: '', telephone: '' });
  const [error, setError] = useState(null);

  // Simulation chargement patients
  useEffect(() => {
    const dummyPatients = [
      { nom: 'Alice', numSec: '123', telephone: '0102030405' },
      { nom: 'Bob', numSec: '456', telephone: '0607080910' },
    ];
    setPatients(dummyPatients);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (isNewPatient) {
      setNewPatientForm((prev) => ({ ...prev, [name]: value }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (isNewPatient && (!newPatientForm.nom || !newPatientForm.numSec)) {
        setError("Nom et numéro requis.");
        return;
      }
      if (!isNewPatient && !form.numSec) {
        setError("Choisir un patient existant.");
        return;
      }
    }
    if (step === 2 && (!form.date || !form.heureDeb || !form.heureFin)) {
      setError("Date et heures requises.");
      return;
    }
    if (step === 3 && !form.matricule) {
      setError("Choisir un médecin.");
      return;
    }
    if (step === 4 && !form.lieu) {
      setError("Choisir un cabinet.");
      return;
    }
    setStep(step + 1);
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Formulaire soumis avec succès !");
  };

  const selectedPatient = !isNewPatient ? patients.find(p => p.numSec === form.numSec) : null;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 p-6 border rounded">
      <h2 className="text-xl font-bold">Formulaire Test de Rendez-vous</h2>

      {error && <div className="text-red-600">{error}</div>}

      {step === 1 && (
        <div>
          <div className="mb-4">
            <label>
              <input type="radio" checked={!isNewPatient} onChange={() => setIsNewPatient(false)} /> Patient existant
            </label>
            <label className="ml-4">
              <input type="radio" checked={isNewPatient} onChange={() => setIsNewPatient(true)} /> Nouveau patient
            </label>
          </div>

          {!isNewPatient && (
            <select
              name="numSec"
              value={form.numSec}
              onChange={handleChange}
              className="w-full border p-2 mb-3"
            >
              <option value="">-- Choisir un patient --</option>
              {patients.map((p) => (
                <option key={p.numSec} value={p.numSec}>
                  {p.nom} ({p.numSec})
                </option>
              ))}
            </select>
          )}

          <input
            name="nom"
            placeholder="Nom"
            value={isNewPatient ? newPatientForm.nom : selectedPatient?.nom || ''}
            onChange={handleChange}
            readOnly={!isNewPatient}
            className="w-full border p-2 mb-2"
          />
          <input
            name="numSec"
            placeholder="Numéro de sécu"
            value={isNewPatient ? newPatientForm.numSec : selectedPatient?.numSec || ''}
            onChange={handleChange}
            readOnly={!isNewPatient}
            className="w-full border p-2 mb-2"
          />
          <input
            name="telephone"
            placeholder="Téléphone"
            value={isNewPatient ? newPatientForm.telephone : selectedPatient?.telephone || ''}
            onChange={handleChange}
            readOnly={!isNewPatient}
            className="w-full border p-2 mb-2"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border p-2 mb-2"
          />
          <input
            type="time"
            name="heureDeb"
            value={form.heureDeb}
            onChange={handleChange}
            className="w-full border p-2 mb-2"
          />
          <input
            type="time"
            name="heureFin"
            value={form.heureFin}
            onChange={handleChange}
            className="w-full border p-2 mb-2"
          />
        </div>
      )}

      {step === 3 && (
        <select name="matricule" value={form.matricule} onChange={handleChange} className="w-full border p-2 mb-2">
          <option value="">-- Choisir un médecin --</option>
          {medecins.map((m) => (
            <option key={m.matricule} value={m.matricule}>
              {m.nom} ({m.type})
            </option>
          ))}
        </select>
      )}

      {step === 4 && (
        <select name="lieu" value={form.lieu} onChange={handleChange} className="w-full border p-2 mb-2">
          <option value="">-- Choisir un cabinet --</option>
          {cabinets.map((c) => (
            <option key={c.lieu} value={c.lieu}>
              {c.nom} ({c.lieu})
            </option>
          ))}
        </select>
      )}

      <div className="flex justify-between">
        {step > 1 && <button type="button" onClick={handlePrev} className="px-4 py-2 bg-gray-300 rounded">Précédent</button>}
        {step < 4 ? (
          <button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-500 text-white rounded">Suivant</button>
        ) : (
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Soumettre</button>
        )}
      </div>
    </form>
  );
}
