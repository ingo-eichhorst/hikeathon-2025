<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Todo Management</h1>
      <div class="flex items-center gap-2">
        <button 
          @click="generateSampleData"
          :disabled="generatingSample"
          class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {{ generatingSample ? 'Generating...' : 'Generate Sample' }}
        </button>
        <button 
          @click="showCreateForm = true"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Todo
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Todos</p>
            <p class="text-2xl font-bold">{{ stats.totalTodos }}</p>
          </div>
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.completedTodos }}</p>
            <p class="text-xs text-gray-500">{{ stats.completionRate.toFixed(1) }}%</p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
            <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ stats.inProgressTodos }}</p>
          </div>
          <div class="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
            <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Blocked</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats.blockedTodos }}</p>
          </div>
          <div class="p-3 bg-red-100 dark:bg-red-900 rounded-full">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ stats.overdueTodos }}</p>
          </div>
          <div class="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
            <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Category Distribution</h2>
        <canvas ref="categoryChart" class="max-h-64"></canvas>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Recent Activity (Last 7 Days)</h2>
        <canvas ref="activityChart" class="max-h-64"></canvas>
      </div>
    </div>

    <!-- Team Progress -->
    <div class="card" v-if="stats.teamProgress.length > 0">
      <h2 class="text-xl font-semibold mb-4">Team Progress</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          v-for="team in stats.teamProgress.slice(0, 6)" 
          :key="team.team_id"
          class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">{{ team.team_name }}</h3>
            <span class="text-sm text-gray-500">{{ team.completionRate.toFixed(1) }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: team.averageProgress + '%' }"
            ></div>
          </div>
          <p class="text-xs text-gray-500">
            {{ team.completedTodos }}/{{ team.totalTodos }} todos completed
          </p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Category</label>
          <select 
            v-model="filters.category" 
            @change="loadTodos"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category.charAt(0).toUpperCase() + category.slice(1) }}
            </option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Status</label>
          <select 
            v-model="filters.status" 
            @change="loadTodos"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Assignee</label>
          <select 
            v-model="filters.assignee" 
            @change="loadTodos"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            <option v-for="assignee in assignees" :key="assignee" :value="assignee">
              {{ assignee }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Priority</label>
          <select 
            v-model="filters.priority_min" 
            @change="loadTodos"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">Any Priority</option>
            <option value="3">High (3+)</option>
            <option value="2">Medium (2+)</option>
            <option value="1">Low (1+)</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Type</label>
          <select 
            v-model="filters.is_global" 
            @change="loadTodos"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Types</option>
            <option :value="true">Global</option>
            <option :value="false">Team-specific</option>
          </select>
        </div>

        <div class="flex items-end">
          <button 
            @click="clearFilters" 
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Todo List -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Todos ({{ todos.length }})</h2>
        <div class="flex gap-2">
          <button 
            @click="loadTodos" 
            :disabled="loading"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
          >
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="todos.length === 0" class="text-center py-8 text-gray-500">
        No todos found matching your criteria.
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="todo in todos" 
          :key="todo.id" 
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          :class="getTodoCardClass(todo)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-semibold">{{ todo.title }}</h3>
                <span class="px-2 py-1 text-xs rounded-full" :class="getCategoryClass(todo.category)">
                  {{ todo.category.toUpperCase() }}
                </span>
                <span class="px-2 py-1 text-xs rounded-full" :class="getStatusClass(todo.status)">
                  {{ todo.status.replace('_', ' ').toUpperCase() }}
                </span>
                <span class="px-2 py-1 text-xs rounded-full" :class="getPriorityClass(todo.priority)">
                  P{{ todo.priority }}
                </span>
                <span v-if="todo.is_global" class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  GLOBAL
                </span>
              </div>
              
              <p v-if="todo.description" class="text-gray-600 dark:text-gray-400 mb-2">
                {{ todo.description }}
              </p>
              
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span>Points: {{ todo.estimated_points }}</span>
                <span v-if="todo.assignee">Assignee: {{ todo.assignee }}</span>
                <span v-if="todo.due_date">
                  Due: {{ formatDate(todo.due_date) }}
                  <span v-if="isOverdue(todo)" class="text-red-600 dark:text-red-400 font-medium">(OVERDUE)</span>
                </span>
                <span>Created: {{ formatDate(todo.created_at) }}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-2 ml-4">
              <button 
                @click="editTodo(todo)"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Edit
              </button>
              <button 
                @click="deleteTodo(todo)"
                :disabled="deleting[todo.id]"
                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
              >
                {{ deleting[todo.id] ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div v-if="showCreateForm || editingTodo" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-semibold mb-4">
          {{ editingTodo ? 'Edit Todo' : 'Create New Todo' }}
        </h2>
        
        <form @submit.prevent="submitTodo" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Title</label>
            <input 
              v-model="form.title"
              type="text" 
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="Enter todo title..."
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <textarea 
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="Enter todo description..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Category</label>
              <input 
                v-model="form.category"
                type="text" 
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                placeholder="e.g., frontend"
                list="categories"
              />
              <datalist id="categories">
                <option v-for="category in categories" :key="category" :value="category"></option>
              </datalist>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Status</label>
              <select 
                v-model="form.status"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Priority</label>
              <select 
                v-model="form.priority"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option :value="0">0 (Lowest)</option>
                <option :value="1">1 (Low)</option>
                <option :value="2">2 (Medium)</option>
                <option :value="3">3 (High)</option>
                <option :value="4">4 (Highest)</option>
                <option :value="5">5 (Critical)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Estimated Points</label>
              <input 
                v-model.number="form.estimated_points"
                type="number" 
                min="1"
                max="21"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Assignee</label>
              <input 
                v-model="form.assignee"
                type="text" 
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                placeholder="Enter assignee name..."
                list="assignees"
              />
              <datalist id="assignees">
                <option v-for="assignee in assignees" :key="assignee" :value="assignee"></option>
              </datalist>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Due Date</label>
              <input 
                v-model="form.due_date"
                type="datetime-local" 
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input 
              v-model="form.is_global"
              type="checkbox" 
              id="is_global"
              class="rounded"
            />
            <label for="is_global" class="text-sm font-medium">Global todo (visible to all teams)</label>
          </div>

          <div class="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              @click="cancelForm"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {{ submitting ? 'Saving...' : (editingTodo ? 'Update Todo' : 'Create Todo') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50" :class="getStatusMessageClass(statusMessage.type)">
      {{ statusMessage.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import Chart from 'chart.js/auto'
import type { Todo, TodoFormData, TodoFilters, TodoStats } from '~/services/todos'

const todoService = useTodoService()

const todos = ref<Todo[]>([])
const categories = ref<string[]>([])
const assignees = ref<string[]>([])
const stats = ref<TodoStats>({
  totalTodos: 0,
  completedTodos: 0,
  inProgressTodos: 0,
  blockedTodos: 0,
  overdueTodos: 0,
  averageCompletionTime: 0,
  completionRate: 0,
  byCategory: {},
  byPriority: {},
  byStatus: {},
  teamProgress: [],
  recentActivity: []
})

const loading = ref(true)
const submitting = ref(false)
const generatingSample = ref(false)
const showCreateForm = ref(false)
const editingTodo = ref<Todo | null>(null)

const deleting = ref<Record<string, boolean>>({})

const filters = ref<TodoFilters>({})
const statusMessage = ref<{ type: string; message: string } | null>(null)
const categoryChart = ref<HTMLCanvasElement>()
const activityChart = ref<HTMLCanvasElement>()

const form = ref<TodoFormData>({
  title: '',
  description: '',
  category: 'general',
  status: 'open',
  priority: 0,
  estimated_points: 1,
  assignee: '',
  due_date: '',
  is_global: true
})

let categoryChartInstance: Chart | null = null
let activityChartInstance: Chart | null = null

const loadTodos = async () => {
  try {
    loading.value = true
    todos.value = await todoService.getTodos(filters.value)
  } catch (error) {
    showStatus('error', 'Failed to load todos')
    console.error('Error loading todos:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await todoService.getTodoStats()
    await nextTick()
    renderCharts()
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const loadMetadata = async () => {
  try {
    categories.value = await todoService.getCategories()
    assignees.value = await todoService.getAssignees()
  } catch (error) {
    console.error('Error loading metadata:', error)
  }
}

const renderCharts = () => {
  renderCategoryChart()
  renderActivityChart()
}

const renderCategoryChart = () => {
  if (!categoryChart.value || !Object.keys(stats.value.byCategory).length) return

  if (categoryChartInstance) {
    categoryChartInstance.destroy()
  }

  const ctx = categoryChart.value.getContext('2d')
  if (!ctx) return

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(stats.value.byCategory),
      datasets: [{
        data: Object.values(stats.value.byCategory),
        backgroundColor: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
          '#8B5CF6', '#EC4899', '#6B7280', '#84CC16'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  })
}

const renderActivityChart = () => {
  if (!activityChart.value || !stats.value.recentActivity.length) return

  if (activityChartInstance) {
    activityChartInstance.destroy()
  }

  const ctx = activityChart.value.getContext('2d')
  if (!ctx) return

  activityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: stats.value.recentActivity.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [
        {
          label: 'Created',
          data: stats.value.recentActivity.map(item => item.created),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Completed',
          data: stats.value.recentActivity.map(item => item.completed),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'In Progress',
          data: stats.value.recentActivity.map(item => item.inProgress),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

const submitTodo = async () => {
  try {
    submitting.value = true
    
    if (editingTodo.value) {
      await todoService.updateTodo(editingTodo.value.id, form.value)
      showStatus('success', 'Todo updated successfully')
    } else {
      await todoService.createTodo(form.value)
      showStatus('success', 'Todo created successfully')
    }
    
    cancelForm()
    await loadTodos()
    await loadStats()
    await loadMetadata()
  } catch (error) {
    showStatus('error', 'Failed to save todo')
    console.error('Error saving todo:', error)
  } finally {
    submitting.value = false
  }
}

const editTodo = (todo: Todo) => {
  editingTodo.value = todo
  form.value = {
    title: todo.title,
    description: todo.description || '',
    category: todo.category,
    status: todo.status,
    priority: todo.priority,
    estimated_points: todo.estimated_points,
    assignee: todo.assignee || '',
    due_date: todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '',
    is_global: todo.is_global
  }
  showCreateForm.value = true
}

const deleteTodo = async (todo: Todo) => {
  if (!confirm(`Are you sure you want to delete "${todo.title}"?`)) return
  
  try {
    deleting.value[todo.id] = true
    await todoService.deleteTodo(todo.id)
    showStatus('success', 'Todo deleted successfully')
    await loadTodos()
    await loadStats()
  } catch (error) {
    showStatus('error', 'Failed to delete todo')
    console.error('Error deleting todo:', error)
  } finally {
    delete deleting.value[todo.id]
  }
}

const generateSampleData = async () => {
  try {
    generatingSample.value = true
    await todoService.generateSampleTodos()
    showStatus('success', 'Sample todos generated successfully')
    await loadTodos()
    await loadStats()
    await loadMetadata()
  } catch (error) {
    showStatus('error', 'Failed to generate sample data')
    console.error('Error generating sample data:', error)
  } finally {
    generatingSample.value = false
  }
}

const clearFilters = () => {
  filters.value = {}
  loadTodos()
}

const cancelForm = () => {
  showCreateForm.value = false
  editingTodo.value = null
  form.value = {
    title: '',
    description: '',
    category: 'general',
    status: 'open',
    priority: 0,
    estimated_points: 1,
    assignee: '',
    due_date: '',
    is_global: true
  }
}

const showStatus = (type: string, message: string) => {
  statusMessage.value = { type, message }
  setTimeout(() => {
    statusMessage.value = null
  }, 3000)
}

// Utility functions
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

const isOverdue = (todo: Todo) => {
  return todo.due_date && 
    new Date(todo.due_date) < new Date() && 
    todo.status !== 'completed'
}

const getTodoCardClass = (todo: Todo) => {
  if (isOverdue(todo)) return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
  if (todo.status === 'blocked') return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
  if (todo.status === 'completed') return 'opacity-75 border-green-300 dark:border-green-600'
  if (todo.priority >= 3) return 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10'
  return ''
}

const getCategoryClass = (category: string) => {
  const colors = {
    'frontend': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'backend': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'database': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'devops': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'testing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'documentation': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'blocked':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

const getPriorityClass = (priority: number) => {
  if (priority >= 4) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  if (priority >= 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  if (priority >= 2) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const getStatusMessageClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'error':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
}

// Initialize
onMounted(async () => {
  await loadTodos()
  await loadStats()
  await loadMetadata()
  
  // Auto-refresh every 60 seconds
  const interval = setInterval(async () => {
    await loadTodos()
    await loadStats()
  }, 60000)
  
  onUnmounted(() => {
    clearInterval(interval)
    if (categoryChartInstance) categoryChartInstance.destroy()
    if (activityChartInstance) activityChartInstance.destroy()
  })
})

useHead({
  title: 'Todo Management - Admin'
})

definePageMeta({
  middleware: 'admin'
})
</script>