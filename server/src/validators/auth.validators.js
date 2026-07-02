import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[0-9]/, 'Password needs a digit');

export const registerSchema = z.object({
  hostelName: z.string().trim().min(2, 'Hostel / PG name is required').max(120),
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email'),
  phone: z.string().trim().max(20).optional().default(''),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  profileImage: z.string().max(500).optional(),
  emergencyContact: z.object({
    name: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    relation: z.string().trim().max(50).optional(),
  }).optional(),
  guardianDetails: z.object({
    name: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    address: z.string().trim().max(300).optional(),
  }).optional(),
});
