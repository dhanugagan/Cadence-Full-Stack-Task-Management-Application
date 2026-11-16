import { Command, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import type { TaskPriority } from '../types/task';

interface TopBarProps {
  breadcrumbProjectName: string;
  breadcrumbViewName: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilterChange: (p: TaskPriority | 'all') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
  onCreateTaskClick: () => void;
}

export function TopBar({
  breadcrumbProjectName,
  breadcrumbViewName,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  isDark,
  onToggleTheme,
  onOpenMobileNav,
  onOpenCommandPalette,
  onCreateTaskClick,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 px-4 lg:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap shrink-0">
            Projects
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {breadcrumbProjectName}
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden md:inline" aria-hidden="true">
            /
          </span>
          <span className="text-slate-500 dark:text-slate-400 hidden md:inline whitespace-nowrap shrink-0">
            {breadcrumbViewName}
          </span>
        </div>
      </div>

      {/* Right: Search, Filter, Command Palette, Theme, Primary CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden md:block w-52 lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter tasks or #tag..."
            aria-label="Filter tasks"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value as TaskPriority | 'all')}
          className="hidden sm:block px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="font-mono">K</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onCreateTaskClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}
