import { HelpCircle } from "lucide-react";

// Guide d’utilisation du formulaire de cabinet
export const cabinetFormGuide = (
  <div className="p-4">
    <h3 className="font-semibold text-xl mb-4 text-gray-800">Comment Remplir le Formulaire Cabinet</h3>
    <p className="mb-6 text-gray-600">
      Ce formulaire permet d’<strong>ajouter</strong> ou de <strong>modifier</strong> un cabinet médical dans le système.
      Il est structuré pour faciliter la saisie des informations de localisation et d’identification.
    </p>
    <ol className="list-decimal pl-6 space-y-5 text-gray-700">
      <li>
        <span className="font-semibold text-gray-700">Nom du cabinet</span>
        <p className="text-sm mt-1 text-gray-600">- Le nom officiel ou usuel du cabinet.</p>
      </li>
      <li>
        <span className="font-semibold text-gray-700">Lieu</span>
        <p className="text-sm mt-1 text-gray-600">- Adresse ou localisation du cabinet (ville, quartier, rue, etc.).</p>
      </li>
      <li>
        <span className="font-semibold text-gray-700">Validation</span>
        <p className="text-sm mt-1 text-gray-600">
          - Les champs sont requis et validés avant soumission.<br />
          - Cliquez sur <strong>"Ajouter"</strong> ou <strong>"Modifier"</strong> pour enregistrer.
        </p>
      </li>
    </ol>
    <p className="mt-6 text-sm text-gray-500">
      En cas d’erreur ou pour annuler, cliquez sur <span className="font-medium">"Annuler"</span>.
    </p>
  </div>
);

export const rdvFromGuide = (
  <div className="p-4">
    <h3 className="font-semibold text-xl mb-4 ">Comment Remplir le Formulaire</h3>
    <p className="mb-6">
      Ce formulaire se complète étape par étape. Utilisez les boutons <span className="font-medium">"Précédent"</span>,{' '}
      <span className="font-medium">"Suivant"</span> et <span className="font-medium">"Annuler"</span> pour naviguer en toute simplicité. Pour
      toute aide, cliquez sur l’icône <HelpCircle className="inline w-4 h-4 text-gray-400" /> en haut à droite.
    </p>

    <ol className="pl-6 space-y-5 text-gray-700 list-disc">
      <li>
        <span className="font-semibold text-gray-700">Étape 1 : Sélection du Patient</span>
        <p className="text-sm mt-1 text-gray-600">
          - Sélectionnez un patient existant via le menu déroulant.
          <br />
          - Pour un nouveau patient, cochez <span className="font-semibold">"Nouveau patient"</span> et renseignez :
          <br />
          • Nom <br />
          • Numéro de sécurité sociale <br />
          • Numéro de téléphone
        </p>
      </li>

      <li>
        <span className="font-semibold text-gray-700">Étape 2 : Date et Heure</span>
        <p className="text-sm mt-1 text-gray-600">
          - Choisissez la date de l’événement.
          <br />
          - Indiquez l’heure de début et de fin.
          <br />
          - Assurez-vous que les horaires sont cohérents.
        </p>
      </li>

      <li>
        <span className="font-semibold text-gray-700">Étape 3 : Sélection du Médecin</span>
        <p className="text-sm mt-1 text-gray-600">
          - Choisissez un médecin dans la liste.
          <br />
          - Chaque médecin est identifié par son matricule et sa spécialité.
        </p>
      </li>

      <li>
        <span className="font-semibold text-gray-700">Étape 4 : Choix du Cabinet</span>
        <p className="text-sm mt-1 text-gray-600">
          - Sélectionnez le cabinet souhaité.
          <br />
          - Les cabinets sont listés par nom et localisation.
        </p>
      </li>

      <li>
        <span className="font-semibold text-gray-700">Étape 5 : Vérification et Soumission</span>
        <p className="text-sm mt-1 text-gray-600">
          - Relisez attentivement les informations saisies.
          <br />
          - Cliquez sur <span className="font-semibold">"Valider" ou "Modifier</span> pour finaliser le formulaire.
        </p>
      </li>
    </ol>

    <p className="mt-6 text-sm text-emerald-400">
      N’oubliez pas : vous pouvez toujours cliquer sur <span className="font-medium">"Annuler"</span> pour interrompre le processus à tout moment.
    </p>
  </div>
)
export const patientFormTutorial = (
  <div className="p-4">
    {/* to-do */}
  </div>
)

// Guide d’utilisation du formulaire
export const medecinFormGuide = (
  <div className="p-4">
    <h3 className="font-semibold text-xl mb-4 text-gray-800">Comment Remplir le Formulaire Médecin</h3>
    <p className="mb-6 text-gray-600">
      Ce formulaire vous permet d’<strong>ajouter</strong> ou de <strong>modifier</strong> un médecin dans le système.
      Il est divisé en deux étapes pour faciliter la saisie. Utilisez les boutons <span className="font-medium">"Suivant"</span>,{' '}
      <span className="font-medium">"Précédent"</span> et <span className="font-medium">"Annuler"</span> pour naviguer entre les étapes.
    </p>
    <ol className="list-decimal pl-6 space-y-5 text-gray-700">
      <li>
        <span className="font-semibold text-gray-700">Étape 1 : Informations Générales</span>
        <p className="text-sm mt-1 text-gray-600">
          - <strong>N°Matricule :</strong> Identifiant unique du médecin.<br />
          - <strong>Nom :</strong> Le nom du médecin.<br />
          - <strong>Email :</strong> L'adresse email du médecin.
        </p>
      </li>
      <li>
        <span className="font-semibold text-gray-700">Étape 2 : Détails supplémentaires</span>
        <p className="text-sm mt-1 text-gray-600">
          - <strong>Téléphone :</strong> Le numéro de téléphone du médecin.<br />
          - <strong>CIN :</strong> Le numéro de la carte d'identité nationale.<br />
          - <strong>Type :</strong> Le type de médecin (généraliste, spécialiste, etc.).
        </p>
      </li>
    </ol>
  </div>
);