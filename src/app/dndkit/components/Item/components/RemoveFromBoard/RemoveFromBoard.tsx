/* eslint-disable react/display-name */
import React, {forwardRef} from 'react';

import {Action, ActionProps} from '../Action';

export const RemoveFromBoard = forwardRef<HTMLButtonElement, ActionProps>(
  (props, ref) => {
    return (
      <Action
        ref={ref}
        cursor="pointer"
        data-cypress="remove-from-board"
        {...props}
      >
        <svg viewBox="0 0 20 20" width="12">
          <path 
            d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" 
            fill="#dc2626"
          />
        </svg>
      </Action>
    );
  }
);