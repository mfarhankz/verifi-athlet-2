import { supabase } from './supabaseClient';
import { Comment } from '@/types/database';

export class CommentService {
  // Fetch comments for a specific athlete
  static async getCommentsForAthlete(athleteId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comment')
      .select(`
        *,
        user_detail (
          id,
          name_first,
          name_last
        )
      `)
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Fetch comment counts for multiple athletes
  static async getCommentCounts(athleteIds: string[]): Promise<Record<string, number>> {
    if (athleteIds.length === 0) return {};
    
    const { data, error } = await supabase
      .from('comment')
      .select('athlete_id')
      .in('athlete_id', athleteIds);
    
    if (error) throw error;
    
    const commentCounts: Record<string, number> = {};
    data?.forEach((comment: { athlete_id: string }) => {
      if (comment.athlete_id) {
        commentCounts[comment.athlete_id] = (commentCounts[comment.athlete_id] || 0) + 1;
      }
    });
    
    return commentCounts;
  }

  // Create a new comment
  static async createComment(commentData: {
    content: string;
    athlete_id: string;
    user_id: string;
    customer_id: string;
  }): Promise<Comment> {
    const { data, error } = await supabase
      .from('comment')
      .insert(commentData)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Update an existing comment
  static async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comment')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Delete a comment
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('comment')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
} 