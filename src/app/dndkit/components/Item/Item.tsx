/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

import { Handle, Remove, RemoveFromBoard } from "./components";

import styles from "./Item.module.scss";
import UserShortInfo from "@/app/(dashboard)/_components/UserShortInfo";
import { Drawer, Input, Modal, Tooltip } from "antd";
import { MailOutlined, MobileOutlined } from "@ant-design/icons";
import PlayerEditModal from "@/app/(dashboard)/_components/PlayerEditModal";
import { RemoveAthleteModal } from "../RemoveAthleteModal";

export interface Props {
  dragOverlay?: boolean;
  color?: string;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: any;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  data?: any;
  componentType?: string;
  onRemove?(): void;
  refreshCallback?: () => void;
  onRemoveFromBoard?: (recruitingBoardId: string, athleteName: string) => void;
  renderItem?(args: {
    dragOverlay: boolean;
    dragging: boolean;
    sorting: boolean;
    index: number | undefined;
    fadeIn: boolean;
    listeners: DraggableSyntheticListeners;
    ref: React.Ref<HTMLElement>;
    style: React.CSSProperties | undefined;
    transform: Props["transform"];
    transition: Props["transition"];
    value: Props["value"];
  }): React.ReactElement;
}

export const Item = React.memo(
  React.forwardRef<HTMLLIElement, Props>(
    (
      {
        color,
        dragOverlay,
        dragging,
        disabled,
        fadeIn,
        handle,
        handleProps,
        height,
        index,
        componentType,
        listeners,
        onRemove,
        renderItem,
        sorting,
        style,
        transition,
        transform,
        value,
        data,
        wrapperStyle,
        refreshCallback,
        onRemoveFromBoard,
        ...props
      },
      ref
    ) => {
      const [open, setOpen] = useState(false);
      const [removeModalOpen, setRemoveModalOpen] = useState(false);

      const showDrawer = () => {
        setOpen(true);
      };

      const onClose = () => {
        setOpen(false);
      };

      const handleRemoveFromBoard = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling to parent container
        setRemoveModalOpen(true);
      };

      const handleRemoveConfirm = () => {
        if (onRemoveFromBoard && player) {
          onRemoveFromBoard(player.recruiting_board_id, `${player.fname} ${player.lname}`);
        }
        setRemoveModalOpen(false);
      };

      const handleRemoveCancel = () => {
        setRemoveModalOpen(false);
      };

      const player = useMemo(
        () => (data || []).find((p: any) => p.id === value),
        [data, value]
      );

      // Log item details for debugging
      React.useEffect(() => {
        if (ref && typeof ref === 'object' && ref.current) {
          const element = ref.current;
          const computedStyle = window.getComputedStyle(element);
          console.log(`[ITEM DEBUG] ${player?.fname} ${player?.lname} (${player?.position || 'Unassigned'}):`, {
            playerName: `${player?.fname} ${player?.lname}`,
            position: player?.position || 'Unassigned',
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            offsetWidth: element.offsetWidth,
            minWidth: computedStyle.minWidth,
            width: computedStyle.width,
            maxWidth: computedStyle.maxWidth,
            whiteSpace: computedStyle.whiteSpace,
            overflow: computedStyle.overflow,
            boundingRect: element.getBoundingClientRect()
          });
        }
      });

      useEffect(() => {
        if (!dragOverlay) {
          return;
        }

        document.body.style.cursor = "grabbing";

        return () => {
          document.body.style.cursor = "";
        };
      }, [dragOverlay]);

      return renderItem ? (
        renderItem({
          dragOverlay: Boolean(dragOverlay),
          dragging: Boolean(dragging),
          sorting: Boolean(sorting),
          index,
          fadeIn: Boolean(fadeIn),
          listeners,
          ref,
          style,
          transform,
          transition,
          value,
        })
      ) : (
        <>
          <li
            className={classNames(
              styles.Wrapper,
              fadeIn && styles.fadeIn,
              sorting && styles.sorting,
              dragOverlay && styles.dragOverlay
            )}
            style={
              {
                ...wrapperStyle,
                transition: [transition, wrapperStyle?.transition]
                  .filter(Boolean)
                  .join(", "),
                "--translate-x": transform
                  ? `${Math.round(transform.x)}px`
                  : undefined,
                "--translate-y": transform
                  ? `${Math.round(transform.y)}px`
                  : undefined,
                "--scale-x": transform?.scaleX
                  ? `${transform.scaleX}`
                  : undefined,
                "--scale-y": transform?.scaleY
                  ? `${transform.scaleY}`
                  : undefined,
                "--index": index,
                "--color": player?.tierColor,
              } as React.CSSProperties
            }
            ref={ref}
            onClick={componentType !== "tableView" ? showDrawer : () => {}}
          >
            <div
              className={classNames(
                styles.Item,
                dragging && styles.dragging,
                handle && styles.withHandle,
                dragOverlay && styles.dragOverlay,
                disabled && styles.disabled,
                player?.tierColor && styles.color,
                player?.source === 'juco' && styles.jucoSource,
                player?.source === 'pre-portal' && styles.prePortalSource,
                player?.source === 'portal' && styles.portalSource,
                player?.source === 'high_school' && styles.highSchoolSource
              )}
              style={style}
              data-cypress="draggable-item"
              {...(!handle ? listeners : undefined)}
              {...props}
              tabIndex={!handle ? 0 : undefined}
            >
              {componentType !== "tableView" ? (
                <UserShortInfo
                  src={player?.image}
                  height={80}
                  width={80}
                  fName={player?.fname}
                  lName={player?.lname}
                  average={player?.avg}
                  rating={player?.rating}
                  title={player?.academy}
                  school={player?.school}
                  schoolIcon={player?.schoolIcon}
                  footer={true}
                  userFirstName={player?.userFirstName}
                  userLastName={player?.userLastName}
                  athleteHeight={player?.ht}
                  athleteWeight={player?.wt}
                  ratingName={player?.ratingName}
                  ratingColor={player?.ratingColor}
                  customerPosition={player?.customer_position}
                />
              ) : (
                <>
                  <i className="icon-add flex plus-filed"></i>
                  <Input
                    type="text"
                    placeholder="Column name"
                    value={value?.toString()}
                  />
                </>
              )}

              <span className={styles.Actions}>
                {onRemove ? (
                  <Remove className={styles.Remove} onClick={onRemove} />
                ) : null}
                {componentType !== "tableView" && onRemoveFromBoard && (
                  <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                    {player?.player_tracking && (
                      <Tooltip 
                        title={player.player_tracking.text_alert ? "Text and Email Alert enabled" : "Email Alert enabled"}
                      >
                        <span 
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            cursor: 'default',
                            flexShrink: 0
                          }}
                        >
                          {player.player_tracking.text_alert ? (
                            <MobileOutlined 
                              style={{ 
                                color: '#1890ff',
                                fontSize: '16px'
                              }} 
                            />
                          ) : (
                            <MailOutlined 
                              style={{ 
                                color: '#1890ff',
                                fontSize: '16px'
                              }} 
                            />
                          )}
                        </span>
                      </Tooltip>
                    )}
                    <RemoveFromBoard onClick={handleRemoveFromBoard} />
                  </span>
                )}
                {handle ? <Handle {...handleProps} {...listeners} /> : null}
              </span>
            </div>
          </li>

          <Drawer width={1000} onClose={onClose} open={open}>
            <PlayerEditModal 
              athleteId={player?.athlete_id} 
              athleteData={player} 
              onClose={() => {
                console.log('Modal onClose called');
                onClose();
                // Call the refresh callback if it exists
                if (refreshCallback) {
                  console.log('Calling refresh callback');
                  refreshCallback();
                } else {
                  console.log('No refresh callback provided');
                }
              }}
            />
          </Drawer>

          <RemoveAthleteModal
            isOpen={removeModalOpen}
            athleteName={player ? `${player.fname} ${player.lname}` : ''}
            onConfirm={handleRemoveConfirm}
            onCancel={handleRemoveCancel}
          />
        </>
      );
    }
  )
);
