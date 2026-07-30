/**
 * @deprecated Prefer importing from `../notes/vaultStore`.
 * Kept as a compatibility shim for older imports.
 */
export {
  listNotes,
  getNote,
  createNote,
  updateNote,
  updateNoteAnywhere,
  removeNote,
  listDueReminders,
  nextUpcomingRemindAt
} from '../notes/vaultStore'
