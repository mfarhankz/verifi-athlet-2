/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef } from "react";
import classNames from "classnames";

import { Handle } from "../Item";

import styles from "./Container.module.scss";
import { Divider } from "antd";

export interface Props {
  children: React.ReactNode;
  columns?: number;
  label?: string;
  style?: React.CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  handleProps?: React.HTMLAttributes<any>;
  scrollable?: boolean;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
  onClick?(): void;
  onRemove?(): void;
  onPositionDelete?(positionName?: string): void;
  hasPlayers?: boolean;
}

export const Container = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      columns = 1,
      handleProps,
      horizontal,
      hover,
      onClick,
      onRemove,
      onPositionDelete,
      hasPlayers,
      label,
      placeholder,
      style,
      scrollable,
      shadow,
      unstyled,
      ...props
    }: Props,
    ref
  ) => {
    const Component = onClick ? "button" : "div";
    const castedRef = ref as React.Ref<HTMLButtonElement & HTMLDivElement>;

    // Log container details for debugging
    React.useEffect(() => {
      if (castedRef && typeof castedRef === 'object' && castedRef.current) {
        const element = castedRef.current;
        const computedStyle = window.getComputedStyle(element);
        console.log(`[CONTAINER DEBUG] ${label || 'Unknown'} container:`, {
          label,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          offsetWidth: element.offsetWidth,
          minWidth: computedStyle.minWidth,
          width: computedStyle.width,
          maxWidth: computedStyle.maxWidth,
          display: computedStyle.display,
          flexBasis: computedStyle.flexBasis,
          gridTemplateColumns: computedStyle.gridTemplateColumns,
          boundingRect: element.getBoundingClientRect()
        });
      }
    });

    return (
      <Component
        {...props}
        ref={castedRef}
        style={
          {
            ...style,
            "--columns": columns,
          } as React.CSSProperties
        }
        className={classNames(
          styles.Container,
          unstyled && styles.unstyled,
          horizontal && styles.horizontal,
          hover && styles.hover,
          placeholder && styles.placeholder,
          scrollable && styles.scrollable,
          shadow && styles.shadow
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label ? (
          <div className={`colum-header ${styles.Header}`}>
            <div className="flex items-center justify-between w-[100%] head-name">
              <span>{label}</span>
              <div className={styles.Actions}>
                {(onPositionDelete || onRemove) ? (
                  <button
                    onClick={() => {
                      // If we have position delete functionality, use it
                      if (onPositionDelete) {
                        onPositionDelete(label);
                      }
                      // If we have remove functionality, also call it
                      if (onRemove) {
                        onRemove();
                      }
                    }}
                    disabled={onPositionDelete && hasPlayers}
                    className={`position-delete-btn ${(onPositionDelete && hasPlayers) ? 'disabled' : ''}`}
                    title={onPositionDelete && hasPlayers ? "Positions with players assigned cannot be deleted" : "Delete position"}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: (onPositionDelete && hasPlayers) ? 'not-allowed' : 'pointer',
                      color: (onPositionDelete && hasPlayers) ? '#ccc' : '#ff4444',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      padding: '6px',
                      marginRight: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px'
                    }}
                  >
                    X
                  </button>
                ) : undefined}
                <Handle {...handleProps} />
              </div>
            </div>
            {/* Hidden section - removed Actual, Budget, Diff columns and related data */}
            {/* <div className="flex items-center justify-between w-[100%]">
              <span>Actual</span>
              <span>Budget</span>
              <span>Diff</span>
            </div>
            <Divider />
            <div className="flex items-center justify-between w-[100%]">
              <span>Players</span>
              <span>4</span>
              <span>0</span>
              <span>0</span>
            </div>
            <Divider />
            <div className="flex items-center justify-between w-[100%]">
              <span>School</span>
              <span>4</span>
              <span>4</span>
              <span>0</span>
            </div> */}
            
          </div>
        ) : null}
        {placeholder ? children : <ul className="pt-0 column-list">{children}</ul>}
      </Component>
    );
  }
);
