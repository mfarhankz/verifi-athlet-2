import React from 'react';
import { Modal } from 'antd';

interface RemoveAthleteModalProps {
  isOpen: boolean;
  athleteName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const RemoveAthleteModal: React.FC<RemoveAthleteModalProps> = ({
  isOpen,
  athleteName,
  onConfirm,
  onCancel,
  loading = false
}) => {
  return (
    <Modal
      title="Remove Athlete"
      open={isOpen}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Yes, Remove"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
    >
      <p>
        Are you sure you want to remove <strong>{athleteName}</strong> from your recruiting board?
      </p>
      <p>This action cannot be undone.</p>
    </Modal>
  );
};