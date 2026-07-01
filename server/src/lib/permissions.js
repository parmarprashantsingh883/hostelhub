/** Granular staff permissions. Admins implicitly have all of these; staff only
 *  get what an admin grants them (staffProfile.permissions). */
export const STAFF_PERMISSIONS = [
  { key: 'visitors.manage', label: 'Manage visitors', group: 'Front desk', desc: 'Check visitors in and out at the gate' },
  { key: 'complaints.manage', label: 'Handle complaints', group: 'Operations', desc: 'Update the status of complaints / tasks' },
  { key: 'maintenance.manage', label: 'Work orders', group: 'Operations', desc: 'Create and update maintenance work orders' },
  { key: 'approvals.raise', label: 'Raise approvals', group: 'Finance', desc: 'Submit approval requests to the admin' },
  { key: 'notices.manage', label: 'Post notices', group: 'Communication', desc: 'Create and manage notices' },
];

export const PERMISSION_KEYS = STAFF_PERMISSIONS.map((p) => p.key);

/** Sensible defaults for a newly-created staff member. */
export const DEFAULT_STAFF_PERMISSIONS = ['visitors.manage', 'complaints.manage'];
