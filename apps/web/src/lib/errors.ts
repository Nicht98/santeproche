/**
 * Maps backend error codes → human-friendly French messages.
 * Add new codes here as the API grows.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  INVALID_OTP: "Code invalide ou expiré. Veuillez réessayer.",
  UNAUTHORIZED: "Session expirée. Veuillez vous reconnecter.",

  // Patients
  PROFILE_EXISTS: "Profil déjà existant. Mettez à jour via les paramètres.",
  USER_NOT_FOUND: "Utilisateur introuvable.",
  PROFILE_NOT_FOUND: "Profil introuvable. Complétez votre inscription.",

  // Booking
  PROVIDER_NOT_FOUND: "Professionnel introuvable ou indisponible.",
  SLOT_TAKEN: "Ce créneau vient d'être réservé par quelqu'un d'autre.",
  NOT_FOUND: "Rendez-vous introuvable.",
  FORBIDDEN: "Vous n'avez pas l'autorisation de faire cette action.",
  ALREADY_CANCELLED: "Ce rendez-vous est déjà annulé.",
  TOO_LATE: "Annulation impossible : le rendez-vous est dans moins de 2 heures.",
  INVALID_STATE: "Impossible de replanifier un rendez-vous annulé ou terminé.",

  // Facilities
  MISSING_PARAMS: "Position GPS manquante. Activez la localisation.",
  INVALID_DATE: "Date invalide. Utilisez le format AAAA-MM-JJ.",

  // Consultations
  APPOINTMENT_NOT_FOUND: "Rendez-vous introuvable.",
  APPOINTMENT_NOT_COMPLETED: "Vous pouvez créer un dossier uniquement pour un rendez-vous terminé.",

  // Chat
  SELF_CONVERSATION: "Vous ne pouvez pas démarrer une conversation avec vous-même.",
  CONVERSATION_EXISTS: "Cette conversation existe déjà.",
  INVALID_PARTICIPANTS: "Le chat nécessite un patient et un soignant.",
  BAD_REQUEST: "Requête invalide. Vérifiez les données envoyées.",

  // Prescriptions
  RECORD_NOT_FOUND: "Dossier de consultation introuvable.",

  // Upload
  NO_FILE: "Aucun fichier sélectionné.",
  INVALID_TYPE: "Format d'image non supporté (JPEG, PNG ou WebP uniquement).",

  // SOS
  MISSING_COORDS: "Coordonnées GPS manquantes.",
  ALREADY_HANDLED: "Cette demande d'urgence a déjà été traitée.",

  // Providers
  ALREADY_VERIFIED: "Votre compte est déjà vérifié. Connectez-vous pour l'utiliser.",
  ALREADY_PENDING: "Une demande est déjà en cours de vérification. Veuillez patienter.",

  // Account status
  ACCOUNT_REJECTED: "Votre inscription a été refusée. Vous ne pouvez plus utiliser cette application.",
  ACCOUNT_SUSPENDED: "Votre compte est suspendu. Contactez l'administrateur.",
};

/**
 * Format any error into a user-friendly French string.
 * Accepts: ApiClientError | Error | null | undefined | string
 */
export function formatError(err: unknown): string {
  if (!err) return "Une erreur est survenue.";
  if (typeof err === "string") return err;

  if (err instanceof Error) {
    const e = err as { code?: string; details?: string[]; message?: string };
    // Try known code first
    if (e.code && ERROR_MESSAGES[e.code]) {
      return ERROR_MESSAGES[e.code];
    }
    // If there are field-level details, prepend a headline
    if (e.details && Array.isArray(e.details) && e.details.length > 0) {
      const first = e.details.slice(0, 3).join(' / ');
      return first || "Veuillez corriger les erreurs indiquées.";
    }
    // Fall back to server message
    if (e.message && e.message.length > 0) return e.message;
  }

  return "Une erreur est survenue.";
}

/**
 * HTTP status → generic message fallback.
 */
export function statusMessage(status: number): string {
  switch (status) {
    case 400:
      return "Requête invalide. Veuillez vérifier vos informations.";
    case 401:
      return "Session expirée. Veuillez vous reconnecter.";
    case 403:
      return "Accès refusé.";
    case 404:
      return "Information introuvable.";
    case 409:
      return "Conflit. Cette action est incompatible avec l'état actuel.";
    case 500:
      return "Erreur serveur. Veuillez réessayer plus tard.";
    default:
      return "Une erreur est survenue.";
  }
}
