import { z } from 'zod';

// タグスキーマ
export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '名前は必須です'),
  color: z.string().optional(),
  family_id: z.string().uuid(),
});

export type Tag = z.infer<typeof tagSchema>;

// タスクスキーマ（再帰的な定義）
export const taskSchema = z.lazy((): z.ZodType<any> => z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional().nullable(),
  due_date: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  is_routine: z.boolean().default(false),
  family_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),  // 親タスクID
  assignee_id: z.string().uuid().nullable().optional(),
  assignee: z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable().optional(),
  }).nullable().optional(),
  created_by_id: z.string().uuid(),
  created_by: z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable().optional(),
  }).nullable().optional(),
  created_at: z.string().transform(val => new Date(val)),
  updated_at: z.string().transform(val => new Date(val)),
  tags: z.array(tagSchema).default([]),
  subtasks: z.array(z.lazy((): z.ZodType<any> => taskSchema)).default([]), // サブタスク
}));

export type Task = z.infer<typeof taskSchema>;

// タスク作成スキーマ
export const taskCreateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  is_routine: z.boolean().default(false),
  family_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(), // 親タスクID
  assignee_id: z.string().uuid().nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type TaskCreate = z.infer<typeof taskCreateSchema>;

// タスク更新スキーマ
export const taskUpdateSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').optional(),
  description: z.string().optional(),
  due_date: z.date().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  is_routine: z.boolean().optional(),
  parent_id: z.string().uuid().nullable().optional(), // 親タスクIDの更新
  assignee_id: z.string().uuid().nullable().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

// サブタスク作成スキーマ（parent_idとfamily_idフィールドを除外）
export const subtaskCreateSchema = taskCreateSchema.omit({ 
  family_id: true, 
  parent_id: true 
});
export type SubtaskCreate = z.infer<typeof subtaskCreateSchema>;

// タスク一覧の応答スキーマ
export const taskListResponseSchema = z.object({
  tasks: z.array(taskSchema),
  total: z.number(),
});

export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

// タスクフィルタースキーマ
export const taskFilterSchema = z.object({
  assignee_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  is_routine: z.boolean().optional(),
  due_before: z.date().optional(),
  due_after: z.date().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  skip: z.number().nonnegative().default(0),
  limit: z.number().positive().default(100),
});

export type TaskFilter = z.infer<typeof taskFilterSchema>;
