import express from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { StudentSession } from '../models/StudentSession.js';
import { requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { parsePagination, isObjectId } from '../lib/request.js';
import { escapeRegex } from '../utils/slug.js';
import { logActivity } from '../services/activity.js';
const router = express.Router();
router.use(requirePermission('users:manage'));
router.get('/', async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const q = String(req.query.q || '').slice(0, 100).trim();
  const filter = q ? { $or: ['name', 'email'].map(field => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } })) } : {};
  const [items, total] = await Promise.all([User.find(filter).select('name email isActive preferredLanguage createdAt lastLoginAt').sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  res.set('Cache-Control', 'no-store').json({ items, total, page, limit, pages: Math.ceil(total / limit) || 1 });
});
router.put('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const { isActive } = z.object({ isActive: z.boolean() }).strict().parse(req.body);
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { returnDocument: 'after' });
  if (!user) throw new ApiError(404, 'Student not found');
  if (!isActive) await StudentSession.deleteMany({ user: user._id });
  await logActivity(req, { action: 'update', entityType: 'User', entityId: user._id, entityLabel: user.email });
  res.json({ _id: user._id, isActive });
});
export default router;
