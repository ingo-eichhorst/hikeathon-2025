export interface Todo {
  id: string
  title: string
  description?: string
  is_global: boolean
  priority: number
  category: string
  status: 'open' | 'in_progress' | 'completed' | 'blocked'
  estimated_points: number
  actual_points?: number
  assignee?: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface TeamTodo {
  id: string
  team_id: string
  todo_id: string
  completed: boolean
  started_at?: string
  completed_at?: string
  updated_at: string
  notes?: string
  progress_percentage: number
  todo?: Todo
}

export interface TodoFormData {
  title: string
  description?: string
  is_global?: boolean
  priority?: number
  category?: string
  status?: string
  estimated_points?: number
  assignee?: string
  due_date?: string
}

export interface TodoFilters {
  category?: string
  status?: string
  assignee?: string
  is_global?: boolean
  priority_min?: number
  priority_max?: number
  due_before?: Date
  due_after?: Date
  overdue?: boolean
}

export interface TodoStats {
  totalTodos: number
  completedTodos: number
  inProgressTodos: number
  blockedTodos: number
  overdueTodos: number
  averageCompletionTime: number
  completionRate: number
  byCategory: Record<string, number>
  byPriority: Record<number, number>
  byStatus: Record<string, number>
  teamProgress: TeamProgress[]
  recentActivity: RecentActivity[]
}

export interface TeamProgress {
  team_id: string
  team_name?: string
  totalTodos: number
  completedTodos: number
  completionRate: number
  averageProgress: number
}

export interface RecentActivity {
  date: string
  created: number
  completed: number
  inProgress: number
}

export class TodoService {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async createTodo(data: TodoFormData): Promise<Todo> {
    const { data: result, error } = await this.supabase
      .from('todos')
      .insert({
        title: data.title,
        description: data.description,
        is_global: data.is_global !== false,
        priority: data.priority || 0,
        category: data.category || 'general',
        status: data.status || 'open',
        estimated_points: data.estimated_points || 1,
        assignee: data.assignee,
        due_date: data.due_date || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create todo: ${error.message}`)
    }

    return result
  }

  async updateTodo(id: string, data: Partial<TodoFormData>): Promise<Todo> {
    const updateData: any = { ...data }
    
    if (data.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: result, error } = await this.supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update todo: ${error.message}`)
    }

    return result
  }

  async deleteTodo(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete todo: ${error.message}`)
    }
  }

  async getTodos(filters: TodoFilters = {}): Promise<Todo[]> {
    let query = this.supabase
      .from('todos')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.assignee) {
      query = query.eq('assignee', filters.assignee)
    }

    if (filters.is_global !== undefined) {
      query = query.eq('is_global', filters.is_global)
    }

    if (filters.priority_min !== undefined) {
      query = query.gte('priority', filters.priority_min)
    }

    if (filters.priority_max !== undefined) {
      query = query.lte('priority', filters.priority_max)
    }

    if (filters.due_before) {
      query = query.lte('due_date', filters.due_before.toISOString())
    }

    if (filters.due_after) {
      query = query.gte('due_date', filters.due_after.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch todos: ${error.message}`)
    }

    let todos = data || []

    // Filter overdue todos if specified
    if (filters.overdue !== undefined) {
      const now = new Date()
      todos = todos.filter((todo: Todo) => {
        const isOverdue = todo.due_date && 
          new Date(todo.due_date) < now && 
          todo.status !== 'completed'
        return filters.overdue ? isOverdue : !isOverdue
      })
    }

    return todos
  }

  async getTodoById(id: string): Promise<Todo | null> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch todo: ${error.message}`)
    }

    return data
  }

  async getTeamTodos(teamId?: string, filters: TodoFilters = {}): Promise<TeamTodo[]> {
    let query = this.supabase
      .from('team_todos')
      .select(`
        *,
        todo:todos(*)
      `)

    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch team todos: ${error.message}`)
    }

    return data || []
  }

  async updateTeamTodoProgress(
    teamId: string, 
    todoId: string, 
    progress: number, 
    notes?: string
  ): Promise<TeamTodo> {
    const updateData: any = {
      progress_percentage: Math.max(0, Math.min(100, progress)),
      notes: notes || null
    }

    if (progress === 100) {
      updateData.completed = true
      updateData.completed_at = new Date().toISOString()
    } else if (progress > 0 && progress < 100) {
      updateData.completed = false
      if (!updateData.started_at) {
        updateData.started_at = new Date().toISOString()
      }
    }

    const { data: result, error } = await this.supabase
      .from('team_todos')
      .upsert({
        team_id: teamId,
        todo_id: todoId,
        ...updateData
      })
      .select(`
        *,
        todo:todos(*)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to update team todo progress: ${error.message}`)
    }

    return result
  }

  async getTodoStats(): Promise<TodoStats> {
    // Get all todos
    const { data: todos, error: todosError } = await this.supabase
      .from('todos')
      .select('*')

    if (todosError) {
      throw new Error(`Failed to fetch todo stats: ${todosError.message}`)
    }

    // Get team progress
    const { data: teamTodos, error: teamTodosError } = await this.supabase
      .from('team_todos')
      .select(`
        *,
        todo:todos(*)
      `)

    if (teamTodosError) {
      throw new Error(`Failed to fetch team todo stats: ${teamTodosError.message}`)
    }

    const allTodos = todos || []
    const allTeamTodos = teamTodos || []
    const now = new Date()

    const stats: TodoStats = {
      totalTodos: allTodos.length,
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
    }

    let totalCompletionTime = 0
    let completedCount = 0

    // Calculate basic stats
    allTodos.forEach((todo: Todo) => {
      // Status counts
      switch (todo.status) {
        case 'completed':
          stats.completedTodos++
          if (todo.completed_at && todo.created_at) {
            const completionTime = new Date(todo.completed_at).getTime() - new Date(todo.created_at).getTime()
            totalCompletionTime += completionTime / (1000 * 60 * 60 * 24) // Convert to days
            completedCount++
          }
          break
        case 'in_progress':
          stats.inProgressTodos++
          break
        case 'blocked':
          stats.blockedTodos++
          break
      }

      // Overdue count
      if (todo.due_date && new Date(todo.due_date) < now && todo.status !== 'completed') {
        stats.overdueTodos++
      }

      // Category distribution
      stats.byCategory[todo.category] = (stats.byCategory[todo.category] || 0) + 1

      // Priority distribution
      stats.byPriority[todo.priority] = (stats.byPriority[todo.priority] || 0) + 1

      // Status distribution
      stats.byStatus[todo.status] = (stats.byStatus[todo.status] || 0) + 1
    })

    // Calculate averages
    stats.completionRate = stats.totalTodos > 0 ? (stats.completedTodos / stats.totalTodos) * 100 : 0
    stats.averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0

    // Calculate team progress
    const teamMap = new Map<string, any>()
    allTeamTodos.forEach((teamTodo: TeamTodo) => {
      const teamId = teamTodo.team_id
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          team_id: teamId,
          team_name: teamId, // TODO: Get actual team name
          totalTodos: 0,
          completedTodos: 0,
          totalProgress: 0
        })
      }

      const team = teamMap.get(teamId)
      team.totalTodos++
      team.totalProgress += teamTodo.progress_percentage

      if (teamTodo.completed) {
        team.completedTodos++
      }
    })

    stats.teamProgress = Array.from(teamMap.values()).map(team => ({
      ...team,
      completionRate: team.totalTodos > 0 ? (team.completedTodos / team.totalTodos) * 100 : 0,
      averageProgress: team.totalTodos > 0 ? team.totalProgress / team.totalTodos : 0
    }))

    // Generate recent activity (last 7 days)
    const activityMap = new Map<string, RecentActivity>()
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      activityMap.set(dateStr, {
        date: dateStr,
        created: 0,
        completed: 0,
        inProgress: 0
      })
    }

    allTodos.forEach((todo: Todo) => {
      const createdDate = todo.created_at.split('T')[0]
      if (activityMap.has(createdDate)) {
        activityMap.get(createdDate)!.created++
      }

      if (todo.completed_at) {
        const completedDate = todo.completed_at.split('T')[0]
        if (activityMap.has(completedDate)) {
          activityMap.get(completedDate)!.completed++
        }
      }

      if (todo.status === 'in_progress') {
        // Approximate in-progress date as updated_at
        const progressDate = todo.updated_at.split('T')[0]
        if (activityMap.has(progressDate)) {
          activityMap.get(progressDate)!.inProgress++
        }
      }
    })

    stats.recentActivity = Array.from(activityMap.values())

    return stats
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('category')
      .not('category', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    const categories = [...new Set((data || []).map((item: any) => item.category))]
    return categories.sort()
  }

  async getAssignees(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('assignee')
      .not('assignee', 'is', null)

    if (error) {
      throw new Error(`Failed to fetch assignees: ${error.message}`)
    }

    const assignees = [...new Set((data || []).map((item: any) => item.assignee))]
    return assignees.sort()
  }

  async generateSampleTodos(): Promise<void> {
    const categories = ['frontend', 'backend', 'database', 'devops', 'documentation', 'testing']
    const priorities = [0, 1, 2, 3, 4, 5]
    const statuses = ['open', 'in_progress', 'completed', 'blocked']
    const assignees = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']

    const sampleTodos = []
    
    for (let i = 0; i < 50; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)]
      const priority = priorities[Math.floor(Math.random() * priorities.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const assignee = Math.random() > 0.3 ? assignees[Math.floor(Math.random() * assignees.length)] : null
      
      const dueDate = Math.random() > 0.5 ? new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000) : null
      
      sampleTodos.push({
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Task #${i + 1}`,
        description: `This is a sample task for ${category} work. It demonstrates the todo management system.`,
        is_global: Math.random() > 0.3,
        priority,
        category,
        status,
        estimated_points: Math.floor(Math.random() * 8) + 1,
        actual_points: status === 'completed' ? Math.floor(Math.random() * 10) + 1 : null,
        assignee,
        due_date: dueDate?.toISOString(),
        completed_at: status === 'completed' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
      })
    }

    const { error } = await this.supabase
      .from('todos')
      .insert(sampleTodos)

    if (error) {
      throw new Error(`Failed to generate sample todos: ${error.message}`)
    }

    console.log(`Generated ${sampleTodos.length} sample todos`)
  }
}

export const useTodoService = () => {
  const { $supabase } = useNuxtApp()
  return new TodoService($supabase)
}