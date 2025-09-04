"use client";

import { useState, useEffect } from 'react';
import { Button, Divider, Flex, Input, Space, Typography } from "antd";
import { supabase } from "@/lib/supabaseClient";
import type { Comment } from "@/types/database";
import { useUser } from "@/contexts/CustomerContext";

interface CommentBoxProps {
  rosterId?: string;
}

export default function CommentBox({ rosterId }: CommentBoxProps) {
  const [comment, setcomment] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userDetails = useUser();

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user?.id && userDetails) {
        setUserTeamId(userDetails.customer_id);
        
        if (rosterId) {
          fetchcomment();
        }
      }
      setIsLoading(false);
    };

    getSession();

    supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
      if (session?.user?.id && userDetails) {
        setUserTeamId(userDetails.customer_id);
        
        if (rosterId) {
          fetchcomment();
        }
      }
    });
  }, [userDetails, rosterId]);

  useEffect(() => {
    if (rosterId && session?.user?.id) {
      fetchcomment();
    }
  }, [rosterId, session]);

  const fetchcomment = async () => {
    if (!rosterId) return;

    try {
      const { data: commentData, error: commentError } = await supabase
        .from('comment')
        .select(`
          *,
          user_detail (
            id,
            name_first,
            name_last
          )
        `)
        .eq('athlete_id', rosterId)
        .order('created_at', { ascending: false });
      
      if (commentError) {
        console.error('Supabase error details:', {
          message: commentError.message,
          details: commentError.details,
          hint: commentError.hint,
          code: commentError.code
        });
        throw commentError;
      }
      
      setcomment(commentData || []);
    } catch (error) {
      console.error('Error in fetchcomment:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setcomment([]);
    }
  };

  const handleSaveComment = async () => {
    if (!rosterId || !newComment.trim() || isSubmitting || !session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        const { error } = await supabase
          .from('comment')
          .update({
            content: newComment,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingComment.id)
          .eq('user_id', session.user.id);
        
        if (error) throw error;
      } else {
        // Create new comment with customer_id
        const { error } = await supabase
          .from('comment')
          .insert({
            content: newComment,
            athlete_id: rosterId,
            user_id: session.user.id,
            customer_id: userTeamId
          });
        
        if (error) throw error;
      }

      // Refresh comment
      await fetchcomment();
      setNewComment("");
      setEditingComment(null);
    } catch (error) {
      console.error('Error saving comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setNewComment(comment.content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const { error } = await supabase
        .from('comment')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      // Refresh comment
      await fetchcomment();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <Flex vertical gap={8}>
      {isLoading ? (
        <Flex justify="center" align="center" style={{ minHeight: '100px' }}>
          <Typography.Text type="secondary">Loading comment...</Typography.Text>
        </Flex>
      ) : (
        <>
          <Flex vertical gap={8}>
            <Input.TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
            />
            <Flex justify="flex-end" gap={8}>
              {editingComment && (
                <Button 
                  type="text" 
                  className="cancel"
                  onClick={() => {
                    setEditingComment(null);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="primary"
                onClick={handleSaveComment}
                loading={isSubmitting}
                disabled={!newComment.trim()}
              >
                {editingComment ? 'Update' : 'Save'}
              </Button>
            </Flex>
          </Flex>

          <Divider />

          {comment.map((comment) => (
            <Flex vertical key={comment.id} className="comment-item">
              <Flex gap={16} align="flex-start">
                <div className="bg-[#F5F5F5] px-3 py-1 rounded-md">
                  <Typography.Text strong>
                    {comment.user_detail?.name_first} {comment.user_detail?.name_last}
                  </Typography.Text>
                </div>
                <Typography.Paragraph className="flex-1">{comment.content}</Typography.Paragraph>
              </Flex>
              <Flex justify="space-between" align="center">
                <Typography.Text type="secondary">
                  {new Date(comment.created_at).toLocaleString()}
                </Typography.Text>
                {session?.user?.id === comment.user_id && (
                  <Space>
                    <Button 
                      type="text" 
                      icon={<i className="icon-edit-2"></i>}
                      onClick={() => handleEditComment(comment)}
                    />
                    <Button 
                      type="text" 
                      icon={<i className="icon-trash"></i>}
                      onClick={() => handleDeleteComment(comment.id)}
                    />
                  </Space>
                )}
              </Flex>
              <Divider />
            </Flex>
          ))}
        </>
      )}
    </Flex>
  );
}
