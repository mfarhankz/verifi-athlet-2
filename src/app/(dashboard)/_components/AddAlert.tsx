import React, { useState } from "react";
import { Button } from "antd";
import { fetchUsersForCustomer } from "@/utils/utils";
import { useCustomer } from "@/contexts/CustomerContext";
import AlertModal from "./AlertModal";

interface TeamUser {
  id: string;
  name_first: string;
  name_last: string;
}

interface AddAlertProps {
  trigger?: React.ReactNode;
  onSave?: (data: unknown) => void;
  renderActiveFilters?: () => string | Promise<string>;
}

const AddAlert: React.FC<AddAlertProps> = ({ trigger, onSave, renderActiveFilters }) => {
  const [open, setOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterString, setFilterString] = useState("");
  const { activeCustomerId } = useCustomer();

  // Fetch user/team data when modal opens
  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    if (activeCustomerId) {
      const users = await fetchUsersForCustomer(activeCustomerId);
      setTeamUsers(users);
    }
    
    // Get the active filters
    if (renderActiveFilters) {
      const result = renderActiveFilters();
      const filters = typeof result === 'string' ? result : await result;
      setFilterString(filters);
    }
    
    setLoading(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleSave = (data: any) => {
    if (onSave) onSave(data);
    setOpen(false);
  };

  return (
    <>
      {trigger && React.isValidElement(trigger) ? (
        React.cloneElement(trigger, {
          ...trigger.props,
          onClick: (e: unknown) => {
            if (trigger.props.onClick) trigger.props.onClick(e);
            handleOpen();
          }
        })
      ) : (
        <Button type="primary" onClick={handleOpen}>Set Up Email Alert</Button>
      )}
      <AlertModal
        open={open}
        onCancel={handleCancel}
        onSave={handleSave}
        initialValues={{ filter: filterString }}
        teamUsers={teamUsers}
        loading={loading}
        mode="add"
      />
    </>
  );
};

export default AddAlert; 