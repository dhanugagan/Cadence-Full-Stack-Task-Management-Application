import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { LIMITS, type Project, type ProjectAccent } from '../types/task';

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string; accent: ProjectAccent }) => Promise<void>;
}

const ACCENTS: Array<{ id: ProjectAccent; label: string; swatchClass: string }> = [
  { id: 'blue', label: 'Cobalt Blue', swatchClass: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', swatchClass: 'bg-amber-600' },
  { id: 'rose', label: 'Crimson', swatchClass: 'bg-rose-600' },
  { id: 'slate', label: 'Slate', swatchClass: 'bg-slate-600' },
];

export function ProjectModal({ isOpen, editingProject, onClose, onSave }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accent, setAccent] = useState<ProjectAccent>('blue');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description);
      setAccent(editingProject.accent);
    } else {
      setName('');
      setDescription('');
      setAccent('blue');
    }
  }, [editingProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name, description, accent });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="project-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project modal"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              required
              maxLength={LIMITS.PROJECT_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mobile App v2"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-desc" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              id="project-desc"
              rows={3}
              maxLength={LIMITS.PROJECT_DESC_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, goals, or milestone summary..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Workspace Color
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccent(item.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    accent === item.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-xs ${item.swatchClass}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white whitespace-nowrap shrink-0"
            >
              {saving ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
