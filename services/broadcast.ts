export interface BroadcastRecord {
  id: string
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  active: boolean
  created_at: string
  expires_at?: string
}

export interface BroadcastFormData {
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  expires_at?: string
  active?: boolean
}

export interface BroadcastFilters {
  priority?: string
  active?: boolean
  expired?: boolean
  from?: Date
  to?: Date
}

export interface BroadcastStats {
  total: number
  active: number
  expired: number
  byPriority: Record<string, number>
  recentActivity: { date: string; count: number }[]
}

export class BroadcastService {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async createBroadcast(data: BroadcastFormData): Promise<BroadcastRecord> {
    const { data: result, error } = await this.supabase
      .from('broadcasts')
      .insert({
        title: data.title,
        message: data.message,
        priority: data.priority,
        expires_at: data.expires_at || null,
        active: data.active !== false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create broadcast: ${error.message}`)
    }

    return result
  }

  async updateBroadcast(id: string, data: Partial<BroadcastFormData>): Promise<BroadcastRecord> {
    const { data: result, error } = await this.supabase
      .from('broadcasts')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update broadcast: ${error.message}`)
    }

    return result
  }

  async deleteBroadcast(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('broadcasts')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete broadcast: ${error.message}`)
    }
  }

  async getBroadcasts(filters: BroadcastFilters = {}): Promise<BroadcastRecord[]> {
    let query = this.supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.active !== undefined) {
      query = query.eq('active', filters.active)
    }

    if (filters.from) {
      query = query.gte('created_at', filters.from.toISOString())
    }

    if (filters.to) {
      query = query.lte('created_at', filters.to.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch broadcasts: ${error.message}`)
    }

    let broadcasts = data || []

    // Filter expired broadcasts if specified
    if (filters.expired !== undefined) {
      const now = new Date()
      broadcasts = broadcasts.filter((broadcast: BroadcastRecord) => {
        const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < now
        return filters.expired ? isExpired : !isExpired
      })
    }

    return broadcasts
  }

  async getBroadcastById(id: string): Promise<BroadcastRecord | null> {
    const { data, error } = await this.supabase
      .from('broadcasts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch broadcast: ${error.message}`)
    }

    return data
  }

  async toggleBroadcastStatus(id: string): Promise<BroadcastRecord> {
    const broadcast = await this.getBroadcastById(id)
    if (!broadcast) {
      throw new Error('Broadcast not found')
    }

    return this.updateBroadcast(id, { active: !broadcast.active })
  }

  async getActiveBroadcasts(): Promise<BroadcastRecord[]> {
    const now = new Date()
    
    const { data, error } = await this.supabase
      .from('broadcasts')
      .select('*')
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch active broadcasts: ${error.message}`)
    }

    return data || []
  }

  async getBroadcastStats(): Promise<BroadcastStats> {
    const { data: allBroadcasts, error } = await this.supabase
      .from('broadcasts')
      .select('*')

    if (error) {
      throw new Error(`Failed to fetch broadcast stats: ${error.message}`)
    }

    const broadcasts = allBroadcasts || []
    const now = new Date()

    const stats: BroadcastStats = {
      total: broadcasts.length,
      active: 0,
      expired: 0,
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
      recentActivity: []
    }

    // Calculate stats
    broadcasts.forEach((broadcast: BroadcastRecord) => {
      // Count by priority
      stats.byPriority[broadcast.priority]++

      // Count active/expired
      const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < now
      if (broadcast.active && !isExpired) {
        stats.active++
      } else if (isExpired) {
        stats.expired++
      }
    })

    // Generate recent activity (last 7 days)
    const activityMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      activityMap.set(dateStr, 0)
    }

    broadcasts.forEach((broadcast: BroadcastRecord) => {
      const dateStr = broadcast.created_at.split('T')[0]
      if (activityMap.has(dateStr)) {
        activityMap.set(dateStr, activityMap.get(dateStr)! + 1)
      }
    })

    stats.recentActivity = Array.from(activityMap.entries()).map(([date, count]) => ({
      date,
      count
    }))

    return stats
  }

  async sendRealtimeBroadcast(broadcast: BroadcastRecord): Promise<void> {
    // Send via Supabase Realtime
    const channel = this.supabase.channel('broadcasts')
    
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: broadcast.id,
        title: broadcast.title,
        message: broadcast.message,
        type: this.mapPriorityToType(broadcast.priority),
        timestamp: new Date().toISOString(),
        from: 'Admin'
      }
    })
  }

  private mapPriorityToType(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'error'
      case 'high':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'success'
    }
  }

  async scheduleExpiry(): Promise<number> {
    const now = new Date()
    
    const { data, error } = await this.supabase
      .from('broadcasts')
      .update({ active: false })
      .lt('expires_at', now.toISOString())
      .eq('active', true)
      .select()

    if (error) {
      console.error('Failed to expire broadcasts:', error)
      return 0
    }

    return data?.length || 0
  }
}

export const useBroadcastService = () => {
  const { $supabase } = useNuxtApp()
  return new BroadcastService($supabase)
}