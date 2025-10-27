import React, { useState, useEffect } from 'react';
import { CommentService } from '../../lib/commentService';
import { Comment } from '@/types/database';
import { supabase } from '../../lib/supabaseClient';
import { useCustomer } from '@/contexts/CustomerContext';
import styles from './CommentsModal.module.css';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, athleteId, athleteName }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { activeCustomerId } = useCustomer();

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen && athleteId) {
      fetchComments();
    }
  }, [isOpen, athleteId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scrolling
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await CommentService.getCommentsForAthlete(athleteId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !activeCustomerId) return;

    try {
      const { data: userDetails } = await supabase.auth.getUser();
      if (!userDetails?.user?.id) {
        console.error('No user ID found');
        return;
      }

      await CommentService.createComment({
        content: newComment.trim(),
        athlete_id: athleteId,
        user_id: userDetails.user.id,
        customer_id: activeCustomerId
      });
      
      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { data: userDetails } = await supabase.auth.getUser();
      if (!userDetails?.user?.id) {
        console.error('No user ID found');
        return;
      }

      await CommentService.deleteComment(commentId, userDetails.user.id);
      await fetchComments(); // Refresh comments
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (!isOpen) return null;

  console.log('CommentsModal rendering:', { isOpen, athleteId, athleteName });

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        width: '100vw',
        height: '100vh'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          minHeight: '300px',
          minWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.2em', color: '#333' }}>
            Comments for {athleteName}
          </h3>
          <button 
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Add New Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9em',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              style={{
                alignSelf: 'flex-end',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              Add Comment
            </button>
          </div>

          {/* Comments List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontStyle: 'italic' }}>
                No comments yet
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    fontSize: '0.9em'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 'bold', color: '#333', fontSize: '0.9em' }}>
                        {comment.user_detail.name_first} {comment.user_detail.name_last}
                      </span>
                      <span style={{ color: '#666', fontSize: '0.8em' }}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        fontSize: '1.2em',
                        cursor: 'pointer',
                        padding: '0 5px',
                        opacity: 0.7,
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ color: '#333', lineHeight: 1.4, whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
