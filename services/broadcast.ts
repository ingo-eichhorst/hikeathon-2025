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

// Notification interfaces and service
export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  sender?: string
  metadata?: Record<string, any>
  created_at: string
  is_read?: boolean
}

export interface NotificationWithReadStatus extends Notification {
  is_read: boolean
}

export class NotificationService {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Create a new notification in the database
   */
  async createNotification(data: {
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    sender?: string
    metadata?: Record<string, any>
  }): Promise<Notification> {
    const { data: result, error } = await this.supabase
      .from('notifications')
      .insert({
        message: data.message,
        type: data.type,
        sender: data.sender || 'System',
        metadata: data.metadata || {}
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    return result
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(limit: number = 25, offset: number = 0): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get notifications with read status for a specific team
   */
  async getNotificationsForTeam(
    teamCode: string,
    limit: number = 25,
    offset: number = 0
  ): Promise<NotificationWithReadStatus[]> {
    const { data, error } = await this.supabase
      .rpc('get_notifications_for_team', {
        p_team_code: teamCode,
        p_limit: limit,
        p_offset: offset
      })

    if (error) {
      throw new Error(`Failed to fetch notifications for team: ${error.message}`)
    }

    return data || []
  }

  /**
   * Mark a notification as read for a specific team
   */
  async markAsRead(notificationId: string, teamCode: string): Promise<void> {
    const { error } = await this.supabase
      .from('notification_reads')
      .upsert({
        notification_id: notificationId,
        team_code: teamCode
      }, {
        onConflict: 'notification_id,team_code'
      })

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  /**
   * Mark all notifications as read for a specific team
   */
  async markAllAsRead(teamCode: string): Promise<void> {
    // Get all notification IDs
    const { data: notifications, error: fetchError } = await this.supabase
      .from('notifications')
      .select('id')

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
    }

    if (!notifications || notifications.length === 0) {
      return
    }

    // Insert read records for all notifications
    const readRecords = notifications.map(n => ({
      notification_id: n.id,
      team_code: teamCode
    }))

    const { error: insertError } = await this.supabase
      .from('notification_reads')
      .upsert(readRecords, {
        onConflict: 'notification_id,team_code'
      })

    if (insertError) {
      throw new Error(`Failed to mark all as read: ${insertError.message}`)
    }
  }

  /**
   * Get unread notification count for a team
   */
  async getUnreadCount(teamCode: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_unread_notification_count', {
        p_team_code: teamCode
      })

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`)
    }

    return data || 0
  }

  /**
   * Send a notification both via realtime and persist to DB
   */
  async sendNotification(data: {
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    sender?: string
    metadata?: Record<string, any>
  }): Promise<Notification> {
    // First, persist to database
    const notification = await this.createNotification(data)

    // Then send via realtime
    const channel = this.supabase.channel('broadcasts')
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: notification.id,
        message: notification.message,
        type: notification.type,
        timestamp: notification.created_at,
        from: notification.sender
      }
    })

    return notification
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await this.supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select()

    if (error) {
      console.error('Failed to delete old notifications:', error)
      return 0
    }

    return data?.length || 0
  }
}

export const useNotificationService = () => {
  const { $supabase } = useNuxtApp()
  return new NotificationService($supabase)
}