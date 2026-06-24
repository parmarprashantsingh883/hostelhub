import Lead, { LEAD_SOURCES, LEAD_STAGES } from '../models/Lead.js';
import { ApiError, asyncHandler } from '../middleware/error.middleware.js';

/** Normalise + validate a lead payload coming from either the admin or public form. */
function buildLeadData(body, { publicSource = false } = {}) {
  const { name, phone, email, source, budget, note, followUpAt } = body;

  if (!name || !String(name).trim()) throw new ApiError(422, 'Name is required');
  if (!phone || !String(phone).trim()) throw new ApiError(422, 'Phone is required');

  let resolvedSource = source;
  if (publicSource) resolvedSource = 'website';
  if (resolvedSource && !LEAD_SOURCES.includes(resolvedSource)) {
    throw new ApiError(422, `Invalid source. Allowed: ${LEAD_SOURCES.join(', ')}`);
  }

  return {
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim().toLowerCase() : '',
    source: resolvedSource || 'website',
    budget: budget === undefined || budget === '' || budget === null ? 0 : Number(budget),
    note: note ? String(note).trim() : '',
    followUpAt: followUpAt ? new Date(followUpAt) : null,
  };
}

/** GET /api/leads?stage=&search=  (admin) */
export const listLeads = asyncHandler(async (req, res) => {
  const { stage, search } = req.query;
  const q = {};
  if (stage) {
    if (!LEAD_STAGES.includes(stage)) throw new ApiError(422, 'Invalid stage filter');
    q.stage = stage;
  }
  if (search) {
    const rx = { $regex: String(search).trim(), $options: 'i' };
    q.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }

  const leads = await Lead.find(q)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { leads, total: leads.length } });
});

/** POST /api/leads  (admin) — full control of source/stage/followUp */
export const createLead = asyncHandler(async (req, res) => {
  const data = buildLeadData(req.body);
  if (req.body.stage) {
    if (!LEAD_STAGES.includes(req.body.stage)) throw new ApiError(422, 'Invalid stage');
    data.stage = req.body.stage;
  }
  data.createdBy = req.user?._id || null;

  const lead = await Lead.create(data);
  res.status(201).json({ success: true, data: { lead } });
});

/** POST /api/leads/public  (unauthenticated booking form) */
export const createPublicLead = asyncHandler(async (req, res) => {
  const data = buildLeadData(req.body, { publicSource: true });
  // Public enquiries always land in the "new" column and are never attributed to a user.
  data.stage = 'new';
  data.createdBy = null;

  const lead = await Lead.create(data);
  res.status(201).json({
    success: true,
    data: { lead: { _id: lead._id, name: lead.name, stage: lead.stage } },
  });
});

/** PATCH /api/leads/:id/stage  { stage }  (admin) */
export const updateStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!stage || !LEAD_STAGES.includes(stage)) {
    throw new ApiError(422, `Stage must be one of: ${LEAD_STAGES.join(', ')}`);
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');

  lead.stage = stage;
  await lead.save();

  res.json({ success: true, data: { lead } });
});

/** DELETE /api/leads/:id  (admin) */
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  await lead.deleteOne();
  res.json({ success: true, message: 'Lead deleted' });
});

/**
 * POST /api/leads/:id/convert  (admin)
 * Marks the lead as converted and returns its data so the UI can prefill a
 * new-tenant / new-resident form. The actual tenant creation lives elsewhere.
 */
export const convertLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');

  lead.stage = 'converted';
  await lead.save();

  res.json({
    success: true,
    data: {
      lead,
      prefill: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        budget: lead.budget,
        note: lead.note,
      },
    },
  });
});
