/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, unstable_batchedUpdates } from "react-dom";
import {
  CancelDrop,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  DndContext,
  DragOverlay,
  DropAnimation,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  Modifiers,
  useDroppable,
  UniqueIdentifier,
  useSensors,
  useSensor,
  MeasuringStrategy,
  KeyboardCoordinateGetter,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  AnimateLayoutChanges,
  SortableContext,
  useSortable,
  arrayMove,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  SortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { coordinateGetter as multipleContainersCoordinateGetter } from "./multipleContainersKeyboardCoordinates";

import { Item, Container, ContainerProps } from "../../components";

import { createRange } from "../../utilities";
import { RecruitingBoardData, RecruitingBoardPosition } from "@/types/database";

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function DroppableContainer({
  children,
  columns = 1,
  disabled,
  id,
  items,
  style,
  data,
  positionConfig,
  onPositionDelete,
  onRemove,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  style?: React.CSSProperties;
  data?: RecruitingBoardData[];
  positionConfig?: RecruitingBoardPosition[];
  onPositionDelete?: (positionName: string) => void;
  onRemove?: () => void;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      type: "container",
      children: items,
    },
    animateLayoutChanges,
  });
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      items.includes(over.id)
    : false;

  // Check if this position has players assigned
  const hasPlayers = items.length > 0;
  
  // Find the position config for this container
  const positionInfo = positionConfig?.find(pos => pos.position_name === id);

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      columns={columns}
      onPositionDelete={onPositionDelete ? () => onPositionDelete(id as string) : undefined}
      onRemove={onRemove}
      hasPlayers={hasPlayers}
      {...props}
    >
      {children}
    </Container>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

interface Props {
  adjustScale?: boolean;
  cancelDrop?: CancelDrop;
  columns?: number;
  containerStyle?: React.CSSProperties;
  coordinateGetter?: KeyboardCoordinateGetter;
  getItemStyles?(args: {
    value: UniqueIdentifier;
    index: number;
    overIndex: number;
    isDragging: boolean;
    containerId: UniqueIdentifier;
    isSorting: boolean;
    isDragOverlay: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: { index: number }): React.CSSProperties;
  itemCount?: number;
  items?: Items;
  data?: RecruitingBoardData[];
  positionConfig?: RecruitingBoardPosition[];
  handle?: boolean;
  renderItem?: any;
  strategy?: SortingStrategy;
  modifiers?: Modifiers;
  minimal?: boolean;
  trashable?: boolean;
  scrollable?: boolean;
  vertical?: boolean;
  refreshCallback?: () => void;
  onRankUpdate?: (updates: { athleteId: string; rank: number; position?: string }[]) => void;
  onPositionDelete?: (positionName: string) => void;
  onPositionCreate?: (positionName: string) => void;
  onRemoveFromBoard?: (recruitingBoardId: string, athleteName: string) => void;
}

export const TRASH_ID = "void";
const PLACEHOLDER_ID = "placeholder";
const empty: UniqueIdentifier[] = [];

function MultipleContainers({
  adjustScale = false,
  itemCount = 3,
  cancelDrop,
  columns,
  handle = false,
  data,
  positionConfig,
  containerStyle,
  coordinateGetter = multipleContainersCoordinateGetter,
  getItemStyles = () => ({}),
  wrapperStyle = () => ({}),
  minimal = false,
  modifiers,
  renderItem,
  strategy = verticalListSortingStrategy,
  trashable = false,
  vertical = false,
  scrollable,
  refreshCallback,
  onRankUpdate,
  onPositionDelete,
  onPositionCreate,
  onRemoveFromBoard,
}: Props) {
  const [items, setItems] = useState<Items>(() => {
    if (Array.isArray(data)) {
      // If we have position config, use it to create containers in the correct order
      if (positionConfig && positionConfig.length > 0) {
        const itemsByPosition = data.reduce((acc, item) => {
          const containerKey = item.position || "Unassigned";
          if (!acc[containerKey]) {
            acc[containerKey] = [];
          }
          acc[containerKey].push(item.id);
          return acc;
        }, {} as Items);

        // Create containers based on position config order, including empty positions
        const orderedItems: Items = {};
        positionConfig.forEach((pos) => {
          orderedItems[pos.position_name] = itemsByPosition[pos.position_name] || [];
        });

        // Always add Unassigned container if there are unassigned athletes
        if (itemsByPosition["Unassigned"] && itemsByPosition["Unassigned"].length > 0) {
          orderedItems["Unassigned"] = itemsByPosition["Unassigned"];
        }

        return orderedItems;
      } else {
        // Fallback to original logic
        return data.reduce((acc, item) => {
          const containerKey = item.position || "Unassigned";
          if (!acc[containerKey]) {
            acc[containerKey] = [];
          }
          acc[containerKey].push(item.id);
          return acc;
        }, {} as Items);
      }
    }
  
    return (
      data ?? {
        A: createRange(itemCount, (index) => `A${index + 1}`),
        B: createRange(itemCount, (index) => `B${index + 1}`),
        C: createRange(itemCount, (index) => `C${index + 1}`),
        D: createRange(itemCount, (index) => `D${index + 1}`),
      }
    );
  });

  const [containers, setContainers] = useState<UniqueIdentifier[]>(() => {
    if (positionConfig && positionConfig.length > 0) {
      const configuredContainers = positionConfig.map(pos => pos.position_name);
      // Add Unassigned if there are any unassigned athletes
      const hasUnassigned = Array.isArray(data) && data.some(item => !item.position);
      if (hasUnassigned && !configuredContainers.includes("Unassigned")) {
        configuredContainers.push("Unassigned");
      }
      return configuredContainers;
    }
    return Object.keys(items) as UniqueIdentifier[];
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const isSortingContainer =
    activeId != null ? containers.includes(activeId) : false;
  
  // Track which containers were affected by the last drag operation
  const [affectedContainers, setAffectedContainers] = useState<UniqueIdentifier[]>([]);

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        if (overId === TRASH_ID) {
          // If the intersecting droppable is the trash, return early
          // Remove this if you're not using trashable functionality in your app
          return intersections;
        }

        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );
  const [clonedItems, setClonedItems] = useState<Items | null>(null);

  // Update items and containers when position config or data changes
  useEffect(() => {
    if (Array.isArray(data)) {
      if (positionConfig && positionConfig.length > 0) {
        const itemsByPosition = data.reduce((acc, item) => {
          const containerKey = item.position || "Unassigned";
          if (!acc[containerKey]) {
            acc[containerKey] = [];
          }
          acc[containerKey].push(item.id);
          return acc;
        }, {} as Items);

        // Create containers based on position config order, including empty positions
        const orderedItems: Items = {};
        positionConfig.forEach((pos) => {
          orderedItems[pos.position_name] = itemsByPosition[pos.position_name] || [];
        });

        // Always add Unassigned container if there are unassigned athletes
        if (itemsByPosition["Unassigned"] && itemsByPosition["Unassigned"].length > 0) {
          orderedItems["Unassigned"] = itemsByPosition["Unassigned"];
        }

        const configuredContainers = positionConfig.map(pos => pos.position_name);
        if (itemsByPosition["Unassigned"] && itemsByPosition["Unassigned"].length > 0 && !configuredContainers.includes("Unassigned")) {
          configuredContainers.push("Unassigned");
        }

        setItems(orderedItems);
        setContainers(configuredContainers);
      } else {
        // Fallback to original logic
        const newItems = data.reduce((acc, item) => {
          const containerKey = item.position || "Unassigned";
          if (!acc[containerKey]) {
            acc[containerKey] = [];
          }
          acc[containerKey].push(item.id);
          return acc;
        }, {} as Items);

        setItems(newItems);
        setContainers(Object.keys(newItems) as UniqueIdentifier[]);
      }
    }
  }, [data, positionConfig]);

  // Generate rank updates when items change and we have affected containers
  useEffect(() => {
    if (affectedContainers.length > 0 && onRankUpdate) {
      generateRankUpdates(affectedContainers);
      setAffectedContainers([]); // Clear the affected containers
    }
  }, [items, affectedContainers, onRankUpdate]);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );
  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) => items[key].includes(id));
  };

  const getIndex = (id: UniqueIdentifier) => {
    const container = findContainer(id);

    if (!container) {
      return -1;
    }

    const index = items[container].indexOf(id);

    return index;
  };

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  };

  // Function to generate rank updates for all athletes in affected containers
  const generateRankUpdates = (affectedContainers: UniqueIdentifier[]) => {
    if (!onRankUpdate || !data) return;

    const updates: { athleteId: string; rank: number; position?: string }[] = [];

    affectedContainers.forEach(containerId => {
      const containerItems = items[containerId] || [];
      
      containerItems.forEach((athleteId, index) => {
        const athleteData = data.find(athlete => athlete.id === athleteId);
        if (athleteData) {
          const update: { athleteId: string; rank: number; position?: string } = {
            athleteId: athleteId.toString(),
            rank: index + 1, // Array index 0 = rank 1, index 1 = rank 2, etc.
            position: containerId.toString() // Update position to match container
          };
          updates.push(update);
        }
      });
    });

    if (updates.length > 0) {
      onRankUpdate(updates);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        setClonedItems(items);
      }}
      onDragOver={({ active, over }) => {
        const overId = over?.id;

        if (overId == null || overId === TRASH_ID || active.id in items) {
          return;
        }

        const overContainer = findContainer(overId);
        const activeContainer = findContainer(active.id);

        if (!overContainer || !activeContainer) {
          return;
        }

        if (activeContainer !== overContainer) {
          setItems((items) => {
            const activeItems = items[activeContainer];
            const overItems = items[overContainer];
            const overIndex = overItems.indexOf(overId);
            const activeIndex = activeItems.indexOf(active.id);

            let newIndex: number;

            if (overId in items) {
              newIndex = overItems.length + 1;
            } else {
              const isBelowOverItem =
                over &&
                active.rect.current.translated &&
                active.rect.current.translated.top >
                  over.rect.top + over.rect.height;

              const modifier = isBelowOverItem ? 1 : 0;

              newIndex =
                overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            recentlyMovedToNewContainer.current = true;

            return {
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (item) => item !== active.id
              ),
              [overContainer]: [
                ...items[overContainer].slice(0, newIndex),
                items[activeContainer][activeIndex],
                ...items[overContainer].slice(
                  newIndex,
                  items[overContainer].length
                ),
              ],
            };
          });
        }
      }}
      onDragEnd={({ active, over }) => {
        if (active.id in items && over?.id) {
          setContainers((containers) => {
            const activeIndex = containers.indexOf(active.id);
            const overIndex = containers.indexOf(over.id);

            return arrayMove(containers, activeIndex, overIndex);
          });
        }

        const activeContainer = findContainer(active.id);

        if (!activeContainer) {
          setActiveId(null);
          return;
        }

        const overId = over?.id;

        if (overId == null) {
          setActiveId(null);
          return;
        }

        if (overId === TRASH_ID) {
          setItems((items) => ({
            ...items,
            [activeContainer]: items[activeContainer].filter(
              (id) => id !== activeId
            ),
          }));
          // Update ranks for the container that lost an item
          setAffectedContainers([activeContainer]);
          setActiveId(null);
          return;
        }

        if (overId === PLACEHOLDER_ID) {
          const newContainerId = getNextContainerId();

          unstable_batchedUpdates(() => {
            setContainers((containers) => [...containers, newContainerId]);
            setItems((items) => ({
              ...items,
              [activeContainer]: items[activeContainer].filter(
                (id) => id !== activeId
              ),
              [newContainerId]: [active.id],
            }));
            setActiveId(null);
          });
          return;
        }

        const overContainer = findContainer(overId);

        if (overContainer) {
          const activeIndex = items[activeContainer].indexOf(active.id);
          const overIndex = items[overContainer].indexOf(overId);

          if (activeIndex !== overIndex) {
            setItems((items) => ({
              ...items,
              [overContainer]: arrayMove(
                items[overContainer],
                activeIndex,
                overIndex
              ),
            }));
          }

          // Update ranks for both containers if they're different
          const containersToUpdate = activeContainer === overContainer 
            ? [activeContainer] 
            : [activeContainer, overContainer];
          
          setAffectedContainers(containersToUpdate);
        }

        setActiveId(null);
      }}
      cancelDrop={cancelDrop}
      onDragCancel={onDragCancel}
      modifiers={modifiers}
    >
      <div
        ref={(element) => {
          if (element) {
            // Log grid container details for debugging
            setTimeout(() => {
              const computedStyle = window.getComputedStyle(element);
              console.log('[GRID DEBUG] MultipleContainers grid wrapper:', {
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                offsetWidth: element.offsetWidth,
                display: computedStyle.display,
                gridAutoFlow: computedStyle.gridAutoFlow,
                gridTemplateColumns: computedStyle.gridTemplateColumns,
                gap: computedStyle.gap,
                containerCount: containers.length,
                visibleContainers: containers.filter((containerId) => {
                  if (containerId === "Unassigned") {
                    return items[containerId] && items[containerId].length > 0;
                  }
                  return true;
                }),
                boundingRect: element.getBoundingClientRect()
              });
            }, 100);
          }
        }}
        style={{
          display: "inline-grid",
          boxSizing: "border-box",
          gap: 15,
          gridAutoFlow: vertical ? "row" : "column",
          gridTemplateColumns: vertical ? "1fr" : `repeat(${containers.filter((containerId) => {
            if (containerId === "Unassigned") {
              return items[containerId] && items[containerId].length > 0;
            }
            return true;
          }).length}, 330px)`,
        }}
      >
        <SortableContext
          items={[...containers, PLACEHOLDER_ID]}
          strategy={
            vertical
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }
        >
          {containers
            .filter((containerId) => {
              // Hide "Unassigned" container if it's empty
              if (containerId === "Unassigned") {
                return items[containerId] && items[containerId].length > 0;
              }
              return true;
            })
            .map((containerId) => (
            <DroppableContainer
              key={containerId}
              id={containerId}
              label={minimal ? undefined : `${containerId}`}
              columns={columns}
              items={items[containerId]}
              scrollable={scrollable}
              style={containerStyle}
              unstyled={minimal}
              onRemove={() => handleRemove(containerId)}
              data={data}
              positionConfig={positionConfig}
              onPositionDelete={onPositionDelete}
            >
              <SortableContext items={items[containerId]} strategy={strategy}>
                {items[containerId].map((value, index) => {
                  
                  return (
                    <SortableItem
                      disabled={isSortingContainer}
                      key={value}
                      data={data}
                      id={value}
                      index={index}
                      handle={handle}
                      style={getItemStyles}
                      wrapperStyle={wrapperStyle}
                      renderItem={renderItem}
                      containerId={containerId}
                      getIndex={getIndex}
                      refreshCallback={refreshCallback}
                      onRemoveFromBoard={onRemoveFromBoard}
                    />
                  );
                })}
              </SortableContext>
            </DroppableContainer>
          ))}
          {minimal ? undefined : (
            <DroppableContainer
              id={PLACEHOLDER_ID}
              disabled={isSortingContainer}
              items={empty}
              
              placeholder
            >
              <button onClick={handleAddColumn} className="add_column"><i></i> + Add Column</button>
              
            </DroppableContainer>
          )}
        </SortableContext>
      </div>
      {typeof window !== "undefined" &&
        createPortal(
          <DragOverlay adjustScale={adjustScale} dropAnimation={dropAnimation}>
            {activeId
              ? containers.includes(activeId)
                ? renderContainerDragOverlay(activeId)
                : renderSortableItemDragOverlay(activeId)
              : null}
          </DragOverlay>,
          document.body
        )}
      {trashable && activeId && !containers.includes(activeId) ? (
        <Trash id={TRASH_ID} />
      ) : null}
    </DndContext>
  );

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    return (
      <Item
        value={id}
        handle={handle}
        data={data}
        style={getItemStyles({
          containerId: findContainer(id) as UniqueIdentifier,
          overIndex: -1,
          index: getIndex(id),
          value: id,
          isSorting: true,
          isDragging: true,
          isDragOverlay: true,
        })}
        color={getColor(id)}
        wrapperStyle={wrapperStyle({ index: 0 })}
        renderItem={renderItem}
        dragOverlay
        refreshCallback={refreshCallback}
      />
    );
  }

  function renderContainerDragOverlay(containerId: UniqueIdentifier) {
    return (
      <Container
        label={`${containerId}`}
        columns={columns}
        style={{
          height: "100%",
        }}
        shadow
        unstyled={false}
      >
        {items[containerId].map((item, index) => (
          <Item
            key={item}
            value={item}
            data={data}
            handle={handle}
            style={getItemStyles({
              containerId,
              overIndex: -1,
              index: getIndex(item),
              value: item,
              isDragging: false,
              isSorting: false,
              isDragOverlay: false,
            })}
            color={getColor(item)}
            wrapperStyle={wrapperStyle({ index })}
            renderItem={renderItem}
            refreshCallback={refreshCallback}
          />
        ))}
      </Container>
    );
  }

  function handleRemove(containerID: UniqueIdentifier) {
    setContainers((containers) =>
      containers.filter((id) => id !== containerID)
    );
  }

  function handleAddColumn() {
    // Prompt user for position name
    const positionName = prompt("Enter position name (e.g., QB, RB, WR):");
    
    if (!positionName || !positionName.trim()) {
      return; // User cancelled or entered empty string
    }
    
    const trimmedPositionName = positionName.trim();
    
    // Check if position already exists
    if (containers.includes(trimmedPositionName)) {
      alert("Position already exists!");
      return;
    }
    
    // If we have position creation functionality, use it
    if (onPositionCreate) {
      onPositionCreate(trimmedPositionName);
    } else {
      // Fallback to local state only
      unstable_batchedUpdates(() => {
        setContainers((containers) => [...containers, trimmedPositionName]);
        setItems((items) => ({
          ...items,
          [trimmedPositionName]: [],
        }));
      });
    }
  }

  function getNextContainerId() {
    const containerIds = Object.keys(items);
    const lastContainerId = containerIds[containerIds.length - 1];

    return String.fromCharCode(lastContainerId.charCodeAt(0) + 1);
  }
}

function getColor(id: UniqueIdentifier) {
  switch (String(id)[0]) {
    case "A":
      return "#7193f1";
    case "B":
      return "#ffda6c";
    case "C":
      return "#00bcd4";
    case "D":
      return "#ef769f";
  }

  return undefined;
}

function Trash({ id }: { id: UniqueIdentifier }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        left: "50%",
        marginLeft: -150,
        bottom: 20,
        width: 300,
        height: 60,
        borderRadius: 5,
        border: "1px solid",
        borderColor: isOver ? "red" : "#DDD",
      }}
    >
      Drop here to delete
    </div>
  );
}

interface SortableItemProps {
  containerId: UniqueIdentifier;
  id: UniqueIdentifier;
  index: number;
  data: any;
  handle: boolean;
  disabled?: boolean;
  style(args: any): React.CSSProperties;
  getIndex(id: UniqueIdentifier): number;
  renderItem(): React.ReactElement;
  wrapperStyle({ index }: { index: number }): React.CSSProperties;
  refreshCallback?: () => void;
  onRemoveFromBoard?: (recruitingBoardId: string, athleteName: string) => void;
}

function SortableItem({
  disabled,
  id,
  index,
  data,
  handle,
  renderItem,
  style,
  containerId,
  getIndex,
  wrapperStyle,
  refreshCallback,
  onRemoveFromBoard,
}: SortableItemProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    isSorting,
    over,
    overIndex,
    transform,
    transition,
  } = useSortable({
    id,
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={id}
      data={data}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      handleProps={handle ? { ref: setActivatorNodeRef } : undefined}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        overIndex: over ? getIndex(over.id) : overIndex,
        containerId,
      })}
      color={getColor(id)}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      renderItem={renderItem}
      refreshCallback={refreshCallback}
      onRemoveFromBoard={onRemoveFromBoard}
    />
  );
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

export default MultipleContainers;
export const metadata = { title: "Presets/Sortable/Multiple Containers" };
